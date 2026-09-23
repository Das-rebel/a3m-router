/**
 * Parallel Ensemble Execution Engine for A3M Router
 *
 * Dispatches a task prompt to N models concurrently, handles per-model
 * timeouts and retries, collects successful responses, and merges results
 * via confidence-weighted voting with Shapley credit assignment.
 *
 * Integration points:
 *   - providerRetry.ts: ProviderRetryHandler for per-model retry logic
 *   - shapleyValue.ts: calculateEnhancedShapley, applyCredit, summarize
 *   - jevRouter.ts: MIN_CONFIDENCE guard for confidence filtering
 *   - optionAttention.ts: optionTextForModel for candidate profiling
 *   - providerConfig.ts: getAvailableProviders for provider metadata
 *   - proxyServer.ts: callProvider for actual LLM calls
 *
 * Observability: X-Ensemble-Provenance header pattern for tracing.
 */

export interface Candidate {
  provider: string;
  model: string;
}

export interface ParallelExecutorConfig {
  timeoutMs?: number;
  maxRetries?: number;
  minConfidence?: number;
  strategy?: EnsembleStrategy;
}

export interface ModelResult {
  modelId: string;
  provider: string;
  answer: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  confidence?: number;
  tokensUsed?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export type EnsembleStrategy = 'majority' | 'weighted' | 'shapley' | 'semantic';

export interface Provenance {
  winner: string;
  contributors: Array<{
    modelId: string;
    provider: string;
    weight: number;
    answer: string;
    latencyMs: number;
  }>;
  totalModels: number;
  successfulModels: number;
  failedModels: number;
  ensembleStrategy: string;
}

export interface EnsembleResult {
  finalAnswer: string;
  confidence: number;
  isUncertain: boolean;
  provenance: Provenance;
  shapleySummary?: {
    totalCredit: number;
    perModel: Array<{
      modelId: string;
      shapleyValue: number;
      loyaltyValue: number;
      handicapValue: number;
      combinedCredit: number;
      reliabilityScore: number;
    }>;
    bestContributor: string;
    worstContributor: string;
  };
  allResults: ModelResult[];
  header: Record<string, string>;
  elapsedMs: number;
}

export interface ProviderCallInput {
  providerId: string;
  model: string;
  prompt: string;
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
}

export interface ProviderCallOutput {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  tokensUsed?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}