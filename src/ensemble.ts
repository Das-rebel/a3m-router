import { createA3MRouter } from './index';
import { 
  calculateEnhancedShapley, 
  LoyaltyMatrix, 
  HandicapCalculator, 
  createAccuracyFn, 
  applyCredit, 
  summarize,
  ShapleySummary 
} from './ensemble/shapleyValue';
import { dialogOptimizer, MultiRoundDialogOptimizer } from './ensemble/multiRoundDialog';
import { ProviderRetryHandler, getDefaultRetryHandler } from './routing/providerRetry';
import { getProviderHealth } from './routing/advancedRouter';

// RouterDecision type
interface RouteDecision {
  primary_model: string;
  tier: 'free' | 'cheap' | 'mid' | 'premium';
  estimated_cost: number;
  complexity: number;
  reasoning: string;
}

// Type alias for external consumers
export type RouterDecision = RouteDecision;

// Re-export A3MRouter as the factory for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const A3MRouter = createA3MRouter as any;
export { createA3MRouter };

export type EnsembleStrategy = 'majority' | 'weighted' | 'conservative' | 'shapley';

export interface EnsembleResponse {
  finalAnswer: string;
  confidence: number; // 0.0 to 1.0
  isUncertain: boolean;
  winner: string;
  allResults: Record<string, { answer: string; score: number }>;
  reasoning: string;
  shapleySummary?: ShapleySummary;        // NEW: Shapley credit breakdown
  dialogState?: ReturnType<typeof dialogOptimizer.getSummary>;  // NEW: Dialog context
}

export class EnsembleOrchestrator {
  private loyaltyMatrix = new LoyaltyMatrix();
  private handicapCalc = new HandicapCalculator();
  
  constructor(private router: InstanceType<typeof A3MRouter>) {}

  /**
   * Execute ensemble with enhanced Shapley value credit assignment
   * Incorporates ethnocentrism (loyalty) and handicap (costly signaling)
   */
  async executeEnsemble(
    query: string,
    providers: string[],
    strategy: EnsembleStrategy = 'majority',
    weights: Record<string, number> = {},
    dialogId?: string
  ): Promise<EnsembleResponse> {
    // 1. Parallel Execution
    const results = await Promise.all(
      providers.map(async (p) => {
        try {
          const res = await this.router.chat(query, { model: p });
          return { provider: p, answer: res.choices[0].message.content, success: true };
        } catch (e) {
          return { provider: p, answer: '', success: false };
        }
      })
    );

    const successful = results.filter(r => r.success);
    if (successful.length === 0) {
      throw new Error('All ensemble providers failed.');
    }

    // 2. Voting Logic
    let winnerAnswer = '';
    let winnerProvider = '';
    let confidence = 0;
    let shapleySummary: ShapleySummary | undefined;

    // Multi-round: add user turn
    if (dialogId) dialogOptimizer.addTurn(dialogId, 'user', query);

    if (strategy === 'majority') {
      const counts: Record<string, number> = {};
      successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      winnerAnswer = sorted[0][0];
      confidence = sorted[0][1] / successful.length;
      winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
    }
    else if (strategy === 'weighted') {
      const weightedCounts: Record<string, number> = {};
      successful.forEach(r => {
        const w = weights[r.provider] || 1.0;
        weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + w;
      });
      const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
      winnerAnswer = sorted[0][0];
      confidence = sorted[0][1] / successful.length;
      winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
    }
    else if (strategy === 'conservative') {
      const counts: Record<string, number> = {};
      successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= 2) {
        winnerAnswer = best[0];
        confidence = best[1] / successful.length;
        winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
      } else {
        winnerAnswer = 'UNCERTAIN';
        confidence = 0;
        winnerProvider = 'none';
      }
    }
    else if (strategy === 'shapley') {
      // === ENHANCED SHAPLEY WITH ETHNOCENTRISM + HANDICAP ===
      const providerIds = successful.map(r => r.provider);
      
      // Accuracy function based on majority vote as ground truth proxy
      const accFn = createAccuracyFn(
        winnerAnswer || successful[0].answer,  // Will be updated after first pass
        m => successful.find(r => r.provider === m)?.answer || ''
      );

      // Calculate enhanced Shapley with loyalty and handicap
      const contributions = calculateEnhancedShapley(
        providerIds, 
        accFn, 
        this.loyaltyMatrix, 
        this.handicapCalc
      );

      // Get majority vote using Shapley-weighted voting
      const shapleyWeights = applyCredit(contributions, weights, 0.5);
      const weightedCounts: Record<string, number> = {};
      successful.forEach(r => {
        weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + shapleyWeights[r.provider];
      });
      const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
      winnerAnswer = sorted[0][0];
      confidence = sorted[0][1];
      winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';

      // Update Shapley summary
      shapleySummary = summarize(contributions);

      // Record performance for handicap tracking
      const isCorrect = (ans: string) => ans === winnerAnswer;
      successful.forEach(r => {
        const cost = weights[r.provider] || 0.001;
        this.handicapCalc.record(r.provider, cost, isCorrect(r.answer));
      });
    }

    // Record loyalty: successful collaborations build trust
    if (strategy === 'shapley') {
      for (const r of successful) {
        if (r.answer === winnerAnswer) {
          for (const other of successful) {
            if (other.provider !== r.provider && other.answer === winnerAnswer) {
              this.loyaltyMatrix.recordSuccess(r.provider, other.provider, 1.0);
            }
          }
        }
      }
    }

    // Multi-round: add assistant turn
    if (dialogId && winnerAnswer !== 'UNCERTAIN') {
      dialogOptimizer.addTurn(dialogId, 'assistant', winnerAnswer, winnerProvider);
    }

    // 3. Final Assembly
    const allResults: Record<string, { answer: string; score: number }> = {};
    successful.forEach(r => {
      allResults[r.provider] = { answer: r.answer, score: r.answer === winnerAnswer ? 1.0 : 0.0 };
    });

    let dialogState;
    if (dialogId) dialogState = dialogOptimizer.getSummary(dialogId);

    return {
      finalAnswer: winnerAnswer,
      confidence,
      isUncertain: confidence < 0.6 || winnerAnswer === 'UNCERTAIN',
      winner: winnerProvider,
      allResults,
      reasoning: `Ensemble of ${successful.length} models. ${Math.round(confidence * 100)}% agreement.`,
      shapleySummary,
      dialogState,
    };
  }

  /** Get best model for current dialog topic */
  getBestModelForTopic(dialogId: string, availableModels: string[]): string | null {
    return dialogOptimizer.getBestModelForTopic(dialogId, availableModels);
  }

  /** Build optimized context for multi-turn conversation */
  buildOptimizedContext(dialogId: string, newQuery: string): string {
    return dialogOptimizer.buildOptimizedContext(dialogId, newQuery);
  }

  /** Clear dialog state */
  clearDialog(dialogId: string): void {
    dialogOptimizer.clearState(dialogId);
  }
}

// Re-export enhanced utilities
export { LoyaltyMatrix, HandicapCalculator, calculateEnhancedShapley } from './ensemble/shapleyValue';
export { dialogOptimizer, MultiRoundDialogOptimizer } from './ensemble/multiRoundDialog';