// A3M Router - Main Entry Point
// Version: 2.0.0

// ============================================================
// ROUTING ENGINE
// ============================================================
export {
  routeQuery,
  routeBatch,
  recommendForTask,
  extractQueryFeatures,
  MODEL_PROFILES,
  updateModelProfile,
  getProviderHealth,
} from './routing/advancedRouter';

// ============================================================
// ROUTING
// ============================================================
export {
  ProviderRetryHandler,
  createRetryHandler,
  getDefaultRetryHandler,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PROVIDER_CONFIG,
  PROVIDER_CONTEXT_LIMITS,
} from './routing/providerRetry';
export type {
  RetryConfig,
  ProviderRetryConfig,
  RetryStats,
  ContextWindowValidation,
} from './routing/providerRetry';

// ============================================================
// PROVIDERS
// ============================================================
export {
  DEFAULT_PROVIDERS,
  getAvailableProviders,
  registerProvider,
  deregisterProvider,
  updateProvider,
  healthCheck,
  checkAllProviders,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
  loadConfig,
  saveConfig,
} from './providers/providerConfig';

export type {
  ProviderTier,
  ProviderFormat,
  ProviderType,
  ProviderCost,
  ProviderDefinition,
} from './providers/providerConfig';

// ============================================================
// COST TRACKING
// ============================================================
export { CostTracker } from './cost/costTracker';
export { BudgetEnforcer, BudgetExceededError, createBudgetEnforcer } from './cost/budgetEnforcer';
export type { BudgetConfig, SpendRecord, BudgetCheckResult } from './cost/budgetEnforcer';

// ============================================================
// MEMORY
// ============================================================
export { MemoryTree } from './memory/memoryTree';

// ReasoningBank — experience-based memory (semantic retrieval + learning)
export { ReasoningBank } from './memory/reasoningBank';
export type { ReasoningMemory, ReasoningBankConfig } from './memory/reasoningBank';

// Hybrid Memory — merges MemoryTree (keyword) + ReasoningBank (semantic)
export { HybridMemory } from './memory/hybridMemory';
export type { HybridMemoryConfig, HybridResult } from './memory/hybridMemory';
export type { MemoryChunk, TreeNode } from './memory/memoryTree';

// ============================================================
// UTILITIES
// ============================================================
export { countTokens, estimateTokens } from './utils/tokenUtils';

// ============================================================
// v2.0.0 FEATURES
// ============================================================
export { SemanticCache } from './cache/semanticCache';
export { GuardrailEngine } from './security/guardrails';
export { CostAnalytics } from './analytics/costAnalytics';
export { createProxyServer } from './server/proxyServer';

// ============================================================
// OBSERVABILITY
// ============================================================
export {
  Tracer,
  getTracer,
  createTracer,
  MetricsCollector,
  getMetrics,
  createMetricsCollector,
  observabilityMiddleware,
  observabilityPlugin,
  budgetAlertMiddleware,
} from './observability';
export type { Span, Metric, RouteTrace, ObservabilityEvent } from './observability';

// ============================================================
// ENSEMBLE ORCHESTRATION
// ============================================================
export { EnsembleOrchestrator, EnsembleStrategy, EnsembleResponse } from './ensemble';

// ============================================================
// ENHANCED SHAPLEY VALUE (Game Theory: Ethnocentrism + Handicap)
// ============================================================
export {
  LoyaltyMatrix,
  HandicapCalculator,
  calculateEnhancedShapley,
  createAccuracyFn,
  applyCredit,
  summarize,
  type ShapleyConfig,
  type ShapleySummary,
} from './ensemble/shapleyValue';

// ============================================================
// MULTI-ROUND DIALOG OPTIMIZATION
// ============================================================
export {
  MultiRoundDialogOptimizer,
  dialogOptimizer,
  type DialogTurn,
  type DialogState,
} from './ensemble/multiRoundDialog';

// ============================================================
// SCIENCE ADAPTER (Google DeepMind Skills)
// ============================================================
export {
  executeScienceQuery,
  routeScienceQuery,
  isScienceQuery,
  detectScienceDomain,
  scienceTools,
  RESEARCH_TEMPLATES,
  type ScienceQuery,
  type ScienceResult,
} from './integrations/scienceAdapter';

// ============================================================
// CONVENIENCE: Create a router instance
// ============================================================
import { routeQuery, routeBatch, recommendForTask } from './routing/advancedRouter';
import { getAvailableProviders, healthCheck } from './providers/providerConfig';
import { CostTracker } from './cost/costTracker';
import { MemoryTree } from './memory/memoryTree';
import { EnsembleOrchestrator } from './ensemble';

export interface A3MRouterOptions {
  defaultProvider?: string;
  enableCache?: boolean;
  enableGuardrails?: boolean;
  costLimit?: number;
}

export function createA3MRouter(options?: A3MRouterOptions) {
  const costTracker = new CostTracker();
  const memoryTree = new MemoryTree();
  const router = {
    route: routeQuery,
    routeBatch,
    recommendForTask,
    getAvailableProviders,
    healthCheck,
    costTracker,
    memoryTree,
    ensemble: new EnsembleOrchestrator(null as any), // Lazy initialization or pass router instance
    options: options || {},
  };

  // Properly link the orchestrator back to the router methods
  (router.ensemble as any).router = router;

  return router;
}

// Default export
export default createA3MRouter;
