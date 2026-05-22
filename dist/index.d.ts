export { routeQuery, routeBatch, recommendForTask, extractQueryFeatures, MODEL_PROFILES, updateModelProfile, getProviderHealth, } from './routing/advancedRouter';
export { ProviderRetryHandler, createRetryHandler, getDefaultRetryHandler, DEFAULT_RETRY_CONFIG, DEFAULT_PROVIDER_CONFIG, PROVIDER_CONTEXT_LIMITS, } from './routing/providerRetry';
export type { RetryConfig, ProviderRetryConfig, RetryStats, ContextWindowValidation, } from './routing/providerRetry';
export { DEFAULT_PROVIDERS, getAvailableProviders, registerProvider, deregisterProvider, updateProvider, healthCheck, checkAllProviders, findCheapestAvailableProvider, findFastestAvailableProvider, loadConfig, saveConfig, } from './providers/providerConfig';
export type { ProviderTier, ProviderFormat, ProviderType, ProviderCost, ProviderDefinition, } from './providers/providerConfig';
export { CostTracker } from './cost/costTracker';
export { BudgetEnforcer, BudgetExceededError, createBudgetEnforcer } from './cost/budgetEnforcer';
export type { BudgetConfig, SpendRecord, BudgetCheckResult } from './cost/budgetEnforcer';
export { MemoryTree } from './memory/memoryTree';
export type { MemoryChunk, TreeNode } from './memory/memoryTree';
export { countTokens, estimateTokens } from './utils/tokenUtils';
export { MODEL_COSTS } from './utils/tokenUtils';
export { SemanticCache } from './cache/semanticCache';
export { GuardrailEngine } from './security/guardrails';
export { CostAnalytics } from './analytics/costAnalytics';
export { createProxyServer } from './server/proxyServer';
import { getAvailableProviders, healthCheck } from './providers/providerConfig';
import { MemoryTree } from './memory/memoryTree';
export interface A3MRouterOptions {
    defaultProvider?: string;
    enableCache?: boolean;
    enableGuardrails?: boolean;
    costLimit?: number;
}
export declare function createA3MRouter(options?: A3MRouterOptions): {
    route: any;
    routeBatch: any;
    recommendForTask: any;
    getAvailableProviders: typeof getAvailableProviders;
    healthCheck: typeof healthCheck;
    costTracker: any;
    memoryTree: MemoryTree;
    options: A3MRouterOptions;
};
export default createA3MRouter;
