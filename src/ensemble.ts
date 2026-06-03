import { createA3MRouter } from './index';

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

export type EnsembleStrategy = 'majority' | 'weighted' | 'conservative';

export interface EnsembleResponse {
  finalAnswer: string;
  confidence: number; // 0.0 to 1.0
  isUncertain: boolean;
  winner: string;
  allResults: Record<string, { answer: string; score: number }>;
  reasoning: string;
}

interface AnswerCount {
  answer: string;
  count: number;
}

export class EnsembleOrchestrator {
  constructor(private router: InstanceType<typeof A3MRouter>) {}

  /**
   * Executes a query across multiple providers in parallel and resolves the best answer.
   */
  async executeEnsemble(
    query: string,
    providers: string[],
    strategy: EnsembleStrategy = 'majority',
    weights: Record<string, number> = {}
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
    const answers = successful.map(r => r.answer.trim());

    if (answers.length === 0) {
      throw new Error('All ensemble providers failed.');
    }

    // 2. Voting Logic
    let winnerAnswer = '';
    let winnerProvider = '';
    let confidence = 0;

    if (strategy === 'majority') {
      const counts: Record<string, number> = {};
      successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
      const sorted: [string, number][] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      winnerAnswer = sorted[0][0];
      confidence = sorted[0][1] / (successful.length || 1);
      winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
    }
    else if (strategy === 'weighted') {
      const weightedCounts: Record<string, number> = {};
      successful.forEach(r => {
        const weight = weights[r.provider] || 1.0;
        weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + weight;
      });
      const sorted: [string, number][] = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
      winnerAnswer = sorted[0][0];
      confidence = sorted[0][1] / (successful.length || 1);
      winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
    }
    else if (strategy === 'conservative') {
      const counts: Record<string, number> = {};
      successful.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
      const best: [string, number] | undefined = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

      if (best && best[1] >= 2) {
        winnerAnswer = best[0];
        confidence = best[1] / (successful.length || 1);
        winnerProvider = successful.find(r => r.answer === winnerAnswer)?.provider || 'unknown';
      } else {
        winnerAnswer = 'UNCERTAIN';
        confidence = 0;
        winnerProvider = 'none';
      }
    }

    // 3. Final Assembly
    const allResults: Record<string, { answer: string; score: number }> = {};
    successful.forEach(r => {
      allResults[r.provider] = {
        answer: r.answer,
        score: r.answer === winnerAnswer ? 1.0 : 0.0
      };
    });

    return {
      finalAnswer: winnerAnswer,
      confidence: confidence,
      isUncertain: confidence < 0.6 || winnerAnswer === 'UNCERTAIN',
      winner: winnerProvider,
      allResults,
      reasoning: `Ensemble of ${successful.length} models. ${Math.round(confidence * 100)}% agreement.`
    };
  }
}
