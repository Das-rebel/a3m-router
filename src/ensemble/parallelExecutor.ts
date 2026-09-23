import {
  ProviderRetryHandler,
  getDefaultRetryHandler,
} from '../routing/providerRetry';
import { MIN_CONFIDENCE } from '../routing/jev/jevRouter';
import {
  calculateEnhancedShapley,
  LoyaltyMatrix,
  HandicapCalculator,
  createAccuracyFn,
  applyCredit,
  summarize,
  ShapleySummary,
  ModelContribution,
} from './shapleyValue';
import { optionTextForModel } from '../routing/jev/jevRouter';
import { getAvailableProviders } from '../providers/providerConfig';
import { callProvider } from '../server/proxyServer';
import { resolveModel } from '../server/modelMapper';
import {
  Candidate,
  ParallelExecutorConfig,
  ModelResult,
  EnsembleResult,
  Provenance,
  EnsembleStrategy,
  ProviderCallInput,
  ProviderCallOutput,
} from './types';

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MIN_CONFIDENCE = MIN_CONFIDENCE;

// Header pattern for observability
const X_ENSEMBLE_PROVENANCE = 'X-Ensemble-Provenance';
const X_ENSEMBLE_CONFIDENCE = 'X-Ensemble-Confidence';
const X_ENSEMBLE_STRATEGY = 'X-Ensemble-Strategy';
const X_ENSEMBLE_ELAPSED = 'X-Ensemble-Elapsed-MS';
const X_ENSEMBLE_CONTRIBUTORS = 'X-Ensemble-Contributors';

// ============================================================
// INTERFACES
// ============================================================

interface DispatchTask {
  candidate: Candidate;
  prompt: string;
  timeoutMs: number;
  maxRetries: number;
}

interface DispatchResult {
  result: ModelResult;
  error?: Error;
}

// ============================================================
// PARALLEL EXECUTOR
// ============================================================

export class ParallelExecutor {
  private retryHandler: ProviderRetryHandler;
  private loyaltyMatrix: LoyaltyMatrix;
  private handicapCalc: HandicapCalculator;
  private config: Required<ParallelExecutorConfig>;

  constructor(config?: Partial<ParallelExecutorConfig>) {
    this.config = {
      timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config?.maxRetries ?? DEFAULT_MAX_RETRIES,
      minConfidence: config?.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
      strategy: config?.strategy ?? 'shapley',
    };

    this.retryHandler = getDefaultRetryHandler();
    this.loyaltyMatrix = new LoyaltyMatrix();
    this.handicapCalc = new HandicapCalculator();
  }

  /**
   * Main entry point: execute a prompt against a candidate list in parallel.
   *
   * @param prompt - The task prompt to dispatch
   * @param candidates - List of {provider, model} pairs to query
   * @returns EnsembleResult with the merged answer and provenance
   */
  async execute(prompt: string, candidates: Candidate[]): Promise<EnsembleResult> {
    const startTime = Date.now();

    // 1. Build dispatch tasks
    const tasks = candidates.map((c) => ({
      candidate: c,
      prompt,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
    }));

    // 2. Dispatch all candidates concurrently via Promise.all
    const dispatchPromises = tasks.map((task) =>
      this.dispatchWithRetry(task)
    );

    const results = await Promise.all(dispatchPromises);

    // 3. Separate successes from failures
    const successful: ModelResult[] = [];
    const failed: ModelResult[] = [];

    for (const r of results) {
      if (r.result.success) {
        successful.push(r.result);
      } else {
        failed.push(r.result);
      }
    }

    // 4. Handle all-failure case
    if (successful.length === 0) {
      const elapsed = Date.now() - startTime;
      return this.buildErrorResult(failed, elapsed);
    }

    // 5. Merge results via confidence-weighted voting
    const elapsed = Date.now() - startTime;
    return this.mergeResults(successful, failed, elapsed);
  }

  /**
   * Dispatch a single candidate with retry logic and timeout.
   */
  private async dispatchWithRetry(task: DispatchTask): Promise<DispatchResult> {
    const { candidate, prompt, timeoutMs, maxRetries } = task;
    const startTime = Date.now();

    try {
      // Resolve the model mapping
      const mapping = resolveModel(`${candidate.provider}/${candidate.model}`, prompt);

      if (!mapping) {
        return {
          result: {
            modelId: `${candidate.provider}/${candidate.model}`,
            provider: candidate.provider,
            answer: '',
            success: false,
            latencyMs: Date.now() - startTime,
            error: `No provider mapping for ${candidate.provider}/${candidate.model}`,
          },
        };
      }

      // Build messages from prompt
      const messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[] = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt },
      ];

      // Execute with retry handler
      const callFn = async (): Promise<ProviderCallOutput> => {
        try {
          const result = await callProvider(
            mapping,
            messages,
            { temperature: 0.7, max_tokens: 2048 }
          );

          return {
            content: result.content,
            model: result.model,
            provider: candidate.provider,
            latencyMs: Date.now() - startTime,
            tokensUsed: result.usage,
          };
        } catch (e: any) {
          throw new Error(e.message || 'Provider call failed');
        }
      };

      const output = await this.retryHandler.executeWithRetry(
        candidate.provider,
        callFn,
        {
          timeout: timeoutMs,
          onRetry: (attempt, error, delayMs) => {
            console.warn(
              `[ParallelExecutor] Retry ${attempt} for ${candidate.provider}/${candidate.model}: ${error.message} (delay=${delayMs}ms)`
            );
          },
        }
      );

      return {
        result: {
          modelId: `${candidate.provider}/${candidate.model}`,
          provider: candidate.provider,
          answer: output.content,
          success: true,
          latencyMs: Date.now() - startTime,
          tokensUsed: output.tokensUsed,
        },
      };
    } catch (error: any) {
      return {
        result: {
          modelId: `${candidate.provider}/${candidate.model}`,
          provider: candidate.provider,
          answer: '',
          success: false,
          latencyMs: Date.now() - startTime,
          error: error.message || 'Unknown error',
        },
      };
    }
  }

  /**
   * Merge successful results using the configured strategy.
   */
  private async mergeResults(
    successful: ModelResult[],
    failed: ModelResult[],
    elapsedMs: number
  ): Promise<EnsembleResult> {
    const strategy = this.config.strategy;
    const answers = successful.map((r) => ({
      provider: r.provider,
      modelId: r.modelId,
      answer: r.answer,
      latencyMs: r.latencyMs,
    }));

    let finalAnswer = '';
    let confidence = 0;
    let shapleySummary: ShapleySummary | undefined;
    let contributions: Map<string, ModelContribution> | undefined;

    // Multi-round dialog tracking
    // (Could integrate with dialogOptimizer here if needed)

    if (strategy === 'majority') {
      const counts: Record<string, number> = {};
      successful.forEach((r) => {
        counts[r.answer] = (counts[r.answer] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      finalAnswer = sorted[0][0];
      confidence = sorted[0][1] / successful.length;
    } else if (strategy === 'weighted') {
      const weights = this.computeBaseWeights(successful);
      const weightedCounts: Record<string, number> = {};
      successful.forEach((r) => {
        const w = weights[r.modelId] || 1.0;
        weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + w;
      });
      const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
      finalAnswer = sorted[0][0];
      confidence = sorted[0][1];
    } else if (strategy === 'shapley') {
      const providerIds = successful.map((r) => r.modelId);
      const groundTruth = successful[0].answer;

      // Accuracy function for Shapley calculation
      const accFn = createAccuracyFn(
        groundTruth,
        (m) => successful.find((r) => r.modelId === m)?.answer || ''
      );

      // Calculate enhanced Shapley with loyalty and handicap
      contributions = calculateEnhancedShapley(
        providerIds,
        accFn,
        this.loyaltyMatrix,
        this.handicapCalc
      );

      // Get base weights (inverse of latency, normalized)
      const baseWeights = this.computeBaseWeights(successful);

      // Apply Shapley credit to voting weights
      const shapleyWeights = applyCredit(contributions, baseWeights, 0.5);

      // Weighted voting using Shapley weights
      const weightedCounts: Record<string, number> = {};
      successful.forEach((r) => {
        const w = shapleyWeights[r.modelId] || 0;
        weightedCounts[r.answer] = (weightedCounts[r.answer] || 0) + w;
      });

      const sorted = Object.entries(weightedCounts).sort((a, b) => b[1] - a[1]);
      finalAnswer = sorted[0][0];
      confidence = sorted[0][1] || 0;

      // Get summary
      shapleySummary = summarize(contributions);

      // Record performance for handicap tracking
      const isCorrect = (ans: string) => ans === finalAnswer;
      successful.forEach((r) => {
        const cost = baseWeights[r.modelId] || 0.001;
        this.handicapCalc.record(r.modelId, cost, isCorrect(r.answer));
      });

      // Record loyalty for successful collaborations
      for (const r of successful) {
        if (r.answer === finalAnswer) {
          for (const other of successful) {
            if (other.modelId !== r.modelId && other.answer === finalAnswer) {
              this.loyaltyMatrix.recordSuccess(r.modelId, other.modelId, 1.0);
            }
          }
        }
      }
    } else if (strategy === 'semantic') {
      // Semantic clustering for equivalent answers
      const clusters = this.semanticCluster(successful, 0.6);

      if (clusters.length > 0) {
        // Use largest cluster as winner
        const largest = clusters.reduce((a, b) =>
          b.providers.length > a.providers.length ? b : a
        );
        finalAnswer = largest.representative;
        confidence = largest.providers.length / successful.length;
      } else {
        finalAnswer = successful[0].answer;
        confidence = 0.5;
      }
    }

    // 6. Apply confidence guard from jevRouter
    const isUncertain = confidence < this.config.minConfidence;

    if (isUncertain && finalAnswer) {
      // Low confidence: mark as uncertain but still return best answer
      confidence = Math.min(confidence, this.config.minConfidence);
    }

    // 7. Build provenance
    const provenance = this.buildProvenance(
      successful,
      failed,
      finalAnswer,
      strategy,
      contributions
    );

    // 8. Build observability headers
    const header = this.buildHeader(provenance, elapsedMs, strategy);

    // 9. Assemble final result
    const result: EnsembleResult = {
      finalAnswer,
      confidence,
      isUncertain,
      provenance,
      shapleySummary,
      allResults: successful,
      header,
      elapsedMs,
    };

    return result;
  }

  /**
   * Build the error result when all providers fail.
   */
  private buildErrorResult(failed: ModelResult[], elapsedMs: number): EnsembleResult {
    const provenance: Provenance = {
      winner: 'none',
      contributors: [],
      totalModels: failed.length,
      successfulModels: 0,
      failedModels: failed.length,
      ensembleStrategy: this.config.strategy,
    };

    const header: Record<string, string> = {
      [X_ENSEMBLE_PROVENANCE]: 'all-failed',
      [X_ENSEMBLE_CONFIDENCE]: '0',
      [X_ENSEMBLE_STRATEGY]: this.config.strategy,
      [X_ENSEMBLE_ELAPSED]: elapsedMs.toString(),
      [X_ENSEMBLE_CONTRIBUTORS]: '0',
    };

    return {
      finalAnswer: '',
      confidence: 0,
      isUncertain: true,
      provenance,
      allResults: failed,
      header,
      elapsedMs,
    };
  }

  /**
   * Compute base weights for candidates based on inverse latency.
   * Faster models get higher base weight.
   */
  private computeBaseWeights(successful: ModelResult[]): Record<string, number> {
    const weights: Record<string, number> = {};
    const latencies = successful.map((r) => r.latencyMs);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const range = maxLatency - minLatency || 1;

    for (let idx = 0; idx < successful.length; idx++) {
      const r = successful[idx];
      const latency = latencies[idx];
      // Inverse latency weight: faster = higher weight
      // Normalized to [0, 1]
      const normalized = maxLatency === minLatency ? 1.0 : 1.0 - (latency - minLatency) / range;
      weights[r.modelId] = Math.max(0.1, normalized);
    }
    return weights;
  }

  /**
   * Semantic clustering of answers to group equivalent responses.
   */
  private semanticCluster(results: ModelResult[], threshold: number): Cluster[] {
    const clusters: Cluster[] = [];
    for (const r of results) {
      let placed = false;
      for (const c of clusters) {
        if (this.semanticSimilarity(c.representative, r.answer) >= threshold) {
          c.providers.push(r.modelId);
          c.answer += '\n\n---\n\n' + r.answer;
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push({ representative: r.answer, providers: [r.modelId], answer: r.answer });
      }
    }
    return clusters;
  }

  /**
   * Simple semantic similarity placeholder (replace with embedding-based similarity in production).
   */
  private semanticSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Build provenance object for observability.
   */
  private buildProvenance(
    successful: ModelResult[],
    failed: ModelResult[],
    finalAnswer: string,
    strategy: EnsembleStrategy,
    contributions?: Map<string, ModelContribution>
  ): Provenance {
    const contributors: Provenance['contributors'] = successful.map(r => ({
      modelId: r.modelId,
      provider: r.provider,
      weight: contributions?.get(r.modelId)?.shapleyValue ?? 0,
      answer: r.answer,
      latencyMs: r.latencyMs,
    }));
    return {
      winner: successful[0]?.modelId ?? 'none',
      contributors,
      totalModels: successful.length + failed.length,
      successfulModels: successful.length,
      failedModels: failed.length,
      ensembleStrategy: strategy,
    };
  }

  /**
   * Build observability headers.
   */
  private buildHeader(provenance: Provenance, elapsedMs: number, strategy: EnsembleStrategy): Record<string, string> {
    return {
      [X_ENSEMBLE_PROVENANCE]: provenance.winner,
      [X_ENSEMBLE_CONFIDENCE]: provenance.contributors[0]?.weight?.toString() ?? '0',
      [X_ENSEMBLE_STRATEGY]: strategy,
      [X_ENSEMBLE_ELAPSED]: elapsedMs.toString(),
      [X_ENSEMBLE_CONTRIBUTORS]: provenance.successfulModels.toString(),
    };
  }
}

interface Cluster {
  representative: string;
  providers: string[];
  answer: string;
}

export default ParallelExecutor;
