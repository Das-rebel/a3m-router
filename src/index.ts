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
export type { MemoryChunk, TreeNode } from './memory/memoryTree';

// ============================================================
// UTILITIES
// ============================================================
export { countTokens, estimateTokens } from './utils/tokenUtils';
export { MODEL_COSTS } from './utils/tokenUtils';

// ============================================================
// v2.0.0 FEATURES
// ============================================================
export { SemanticCache } from './cache/semanticCache';
export { GuardrailEngine } from './security/guardrails';
export { CostAnalytics } from './analytics/costAnalytics';
export { createProxyServer } from './server/proxyServer';

// ============================================================
// CONVENIENCE: Create a router instance
// ============================================================
import { routeQuery, routeBatch, recommendForTask } from './routing/advancedRouter';
import { getAvailableProviders, healthCheck } from './providers/providerConfig';
import { CostTracker } from './cost/costTracker';
import { MemoryTree } from './memory/memoryTree';

export interface A3MRouterOptions {
  defaultProvider?: string;
  enableCache?: boolean;
  enableGuardrails?: boolean;
  costLimit?: number;
}

export function createA3MRouter(options?: A3MRouterOptions) {
  const costTracker = new CostTracker();
  const memoryTree = new MemoryTree();

  return {
    route: routeQuery,
    routeBatch,
    recommendForTask,
    getAvailableProviders,
    healthCheck,
    costTracker,
    memoryTree,
    options: options || {},
  };
}

// Default export
export default createA3MRouter;
