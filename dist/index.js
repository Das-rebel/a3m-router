"use strict";
// A3M Router - Main Entry Point
// Version: 2.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyServer = exports.CostAnalytics = exports.GuardrailEngine = exports.SemanticCache = exports.MODEL_COSTS = exports.estimateTokens = exports.countTokens = exports.MemoryTree = exports.createBudgetEnforcer = exports.BudgetExceededError = exports.BudgetEnforcer = exports.CostTracker = exports.saveConfig = exports.loadConfig = exports.findFastestAvailableProvider = exports.findCheapestAvailableProvider = exports.checkAllProviders = exports.healthCheck = exports.updateProvider = exports.deregisterProvider = exports.registerProvider = exports.getAvailableProviders = exports.DEFAULT_PROVIDERS = exports.PROVIDER_CONTEXT_LIMITS = exports.DEFAULT_PROVIDER_CONFIG = exports.DEFAULT_RETRY_CONFIG = exports.getDefaultRetryHandler = exports.createRetryHandler = exports.ProviderRetryHandler = exports.getProviderHealth = exports.updateModelProfile = exports.MODEL_PROFILES = exports.extractQueryFeatures = exports.recommendForTask = exports.routeBatch = exports.routeQuery = void 0;
exports.createA3MRouter = createA3MRouter;
// ============================================================
// ROUTING ENGINE
// ============================================================
var advancedRouter_1 = require("./routing/advancedRouter");
Object.defineProperty(exports, "routeQuery", { enumerable: true, get: function () { return advancedRouter_1.routeQuery; } });
Object.defineProperty(exports, "routeBatch", { enumerable: true, get: function () { return advancedRouter_1.routeBatch; } });
Object.defineProperty(exports, "recommendForTask", { enumerable: true, get: function () { return advancedRouter_1.recommendForTask; } });
Object.defineProperty(exports, "extractQueryFeatures", { enumerable: true, get: function () { return advancedRouter_1.extractQueryFeatures; } });
Object.defineProperty(exports, "MODEL_PROFILES", { enumerable: true, get: function () { return advancedRouter_1.MODEL_PROFILES; } });
Object.defineProperty(exports, "updateModelProfile", { enumerable: true, get: function () { return advancedRouter_1.updateModelProfile; } });
Object.defineProperty(exports, "getProviderHealth", { enumerable: true, get: function () { return advancedRouter_1.getProviderHealth; } });
// ============================================================
// ROUTING
// ============================================================
var providerRetry_1 = require("./routing/providerRetry");
Object.defineProperty(exports, "ProviderRetryHandler", { enumerable: true, get: function () { return providerRetry_1.ProviderRetryHandler; } });
Object.defineProperty(exports, "createRetryHandler", { enumerable: true, get: function () { return providerRetry_1.createRetryHandler; } });
Object.defineProperty(exports, "getDefaultRetryHandler", { enumerable: true, get: function () { return providerRetry_1.getDefaultRetryHandler; } });
Object.defineProperty(exports, "DEFAULT_RETRY_CONFIG", { enumerable: true, get: function () { return providerRetry_1.DEFAULT_RETRY_CONFIG; } });
Object.defineProperty(exports, "DEFAULT_PROVIDER_CONFIG", { enumerable: true, get: function () { return providerRetry_1.DEFAULT_PROVIDER_CONFIG; } });
Object.defineProperty(exports, "PROVIDER_CONTEXT_LIMITS", { enumerable: true, get: function () { return providerRetry_1.PROVIDER_CONTEXT_LIMITS; } });
// ============================================================
// PROVIDERS
// ============================================================
var providerConfig_1 = require("./providers/providerConfig");
Object.defineProperty(exports, "DEFAULT_PROVIDERS", { enumerable: true, get: function () { return providerConfig_1.DEFAULT_PROVIDERS; } });
Object.defineProperty(exports, "getAvailableProviders", { enumerable: true, get: function () { return providerConfig_1.getAvailableProviders; } });
Object.defineProperty(exports, "registerProvider", { enumerable: true, get: function () { return providerConfig_1.registerProvider; } });
Object.defineProperty(exports, "deregisterProvider", { enumerable: true, get: function () { return providerConfig_1.deregisterProvider; } });
Object.defineProperty(exports, "updateProvider", { enumerable: true, get: function () { return providerConfig_1.updateProvider; } });
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return providerConfig_1.healthCheck; } });
Object.defineProperty(exports, "checkAllProviders", { enumerable: true, get: function () { return providerConfig_1.checkAllProviders; } });
Object.defineProperty(exports, "findCheapestAvailableProvider", { enumerable: true, get: function () { return providerConfig_1.findCheapestAvailableProvider; } });
Object.defineProperty(exports, "findFastestAvailableProvider", { enumerable: true, get: function () { return providerConfig_1.findFastestAvailableProvider; } });
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return providerConfig_1.loadConfig; } });
Object.defineProperty(exports, "saveConfig", { enumerable: true, get: function () { return providerConfig_1.saveConfig; } });
// ============================================================
// COST TRACKING
// ============================================================
var costTracker_1 = require("./cost/costTracker");
Object.defineProperty(exports, "CostTracker", { enumerable: true, get: function () { return costTracker_1.CostTracker; } });
var budgetEnforcer_1 = require("./cost/budgetEnforcer");
Object.defineProperty(exports, "BudgetEnforcer", { enumerable: true, get: function () { return budgetEnforcer_1.BudgetEnforcer; } });
Object.defineProperty(exports, "BudgetExceededError", { enumerable: true, get: function () { return budgetEnforcer_1.BudgetExceededError; } });
Object.defineProperty(exports, "createBudgetEnforcer", { enumerable: true, get: function () { return budgetEnforcer_1.createBudgetEnforcer; } });
// ============================================================
// MEMORY
// ============================================================
var memoryTree_1 = require("./memory/memoryTree");
Object.defineProperty(exports, "MemoryTree", { enumerable: true, get: function () { return memoryTree_1.MemoryTree; } });
// ============================================================
// UTILITIES
// ============================================================
var tokenUtils_1 = require("./utils/tokenUtils");
Object.defineProperty(exports, "countTokens", { enumerable: true, get: function () { return tokenUtils_1.countTokens; } });
Object.defineProperty(exports, "estimateTokens", { enumerable: true, get: function () { return tokenUtils_1.estimateTokens; } });
var tokenUtils_2 = require("./utils/tokenUtils");
Object.defineProperty(exports, "MODEL_COSTS", { enumerable: true, get: function () { return tokenUtils_2.MODEL_COSTS; } });
// ============================================================
// v2.0.0 FEATURES
// ============================================================
var semanticCache_1 = require("./cache/semanticCache");
Object.defineProperty(exports, "SemanticCache", { enumerable: true, get: function () { return semanticCache_1.SemanticCache; } });
var guardrails_1 = require("./security/guardrails");
Object.defineProperty(exports, "GuardrailEngine", { enumerable: true, get: function () { return guardrails_1.GuardrailEngine; } });
var costAnalytics_1 = require("./analytics/costAnalytics");
Object.defineProperty(exports, "CostAnalytics", { enumerable: true, get: function () { return costAnalytics_1.CostAnalytics; } });
var proxyServer_1 = require("./server/proxyServer");
Object.defineProperty(exports, "createProxyServer", { enumerable: true, get: function () { return proxyServer_1.createProxyServer; } });
// ============================================================
// CONVENIENCE: Create a router instance
// ============================================================
const advancedRouter_2 = require("./routing/advancedRouter");
const providerConfig_2 = require("./providers/providerConfig");
const costTracker_2 = require("./cost/costTracker");
const memoryTree_2 = require("./memory/memoryTree");
function createA3MRouter(options) {
    const costTracker = new costTracker_2.CostTracker();
    const memoryTree = new memoryTree_2.MemoryTree();
    return {
        route: advancedRouter_2.routeQuery,
        routeBatch: advancedRouter_2.routeBatch,
        recommendForTask: advancedRouter_2.recommendForTask,
        getAvailableProviders: providerConfig_2.getAvailableProviders,
        healthCheck: providerConfig_2.healthCheck,
        costTracker,
        memoryTree,
        options: options || {},
    };
}
// Default export
exports.default = createA3MRouter;
//# sourceMappingURL=index.js.map