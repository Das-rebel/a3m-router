"use strict";
// A3M Router - Main Entry Point
// Version: 2.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCredit = exports.createAccuracyFn = exports.calculateEnhancedShapley = exports.HandicapCalculator = exports.LoyaltyMatrix = exports.EnsembleOrchestrator = exports.budgetAlertMiddleware = exports.observabilityPlugin = exports.observabilityMiddleware = exports.createMetricsCollector = exports.getMetrics = exports.MetricsCollector = exports.createTracer = exports.getTracer = exports.Tracer = exports.createProxyServer = exports.CostAnalytics = exports.GuardrailEngine = exports.SemanticCache = exports.estimateTokens = exports.countTokens = exports.MemoryTree = exports.createBudgetEnforcer = exports.BudgetExceededError = exports.BudgetEnforcer = exports.CostTracker = exports.saveConfig = exports.loadConfig = exports.findFastestAvailableProvider = exports.findCheapestAvailableProvider = exports.checkAllProviders = exports.healthCheck = exports.updateProvider = exports.deregisterProvider = exports.registerProvider = exports.getAvailableProviders = exports.DEFAULT_PROVIDERS = exports.PROVIDER_CONTEXT_LIMITS = exports.DEFAULT_PROVIDER_CONFIG = exports.DEFAULT_RETRY_CONFIG = exports.getDefaultRetryHandler = exports.createRetryHandler = exports.ProviderRetryHandler = exports.getProviderHealth = exports.updateModelProfile = exports.MODEL_PROFILES = exports.extractQueryFeatures = exports.recommendForTask = exports.routeBatch = exports.routeQuery = void 0;
exports.RESEARCH_TEMPLATES = exports.scienceTools = exports.detectScienceDomain = exports.isScienceQuery = exports.routeScienceQuery = exports.executeScienceQuery = exports.dialogOptimizer = exports.MultiRoundDialogOptimizer = exports.summarize = void 0;
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
// OBSERVABILITY
// ============================================================
var observability_1 = require("./observability");
Object.defineProperty(exports, "Tracer", { enumerable: true, get: function () { return observability_1.Tracer; } });
Object.defineProperty(exports, "getTracer", { enumerable: true, get: function () { return observability_1.getTracer; } });
Object.defineProperty(exports, "createTracer", { enumerable: true, get: function () { return observability_1.createTracer; } });
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return observability_1.MetricsCollector; } });
Object.defineProperty(exports, "getMetrics", { enumerable: true, get: function () { return observability_1.getMetrics; } });
Object.defineProperty(exports, "createMetricsCollector", { enumerable: true, get: function () { return observability_1.createMetricsCollector; } });
Object.defineProperty(exports, "observabilityMiddleware", { enumerable: true, get: function () { return observability_1.observabilityMiddleware; } });
Object.defineProperty(exports, "observabilityPlugin", { enumerable: true, get: function () { return observability_1.observabilityPlugin; } });
Object.defineProperty(exports, "budgetAlertMiddleware", { enumerable: true, get: function () { return observability_1.budgetAlertMiddleware; } });
// ============================================================
// ENSEMBLE ORCHESTRATION
// ============================================================
var ensemble_1 = require("./ensemble");
Object.defineProperty(exports, "EnsembleOrchestrator", { enumerable: true, get: function () { return ensemble_1.EnsembleOrchestrator; } });
// ============================================================
// ENHANCED SHAPLEY VALUE (Game Theory: Ethnocentrism + Handicap)
// ============================================================
var shapleyValue_1 = require("./ensemble/shapleyValue");
Object.defineProperty(exports, "LoyaltyMatrix", { enumerable: true, get: function () { return shapleyValue_1.LoyaltyMatrix; } });
Object.defineProperty(exports, "HandicapCalculator", { enumerable: true, get: function () { return shapleyValue_1.HandicapCalculator; } });
Object.defineProperty(exports, "calculateEnhancedShapley", { enumerable: true, get: function () { return shapleyValue_1.calculateEnhancedShapley; } });
Object.defineProperty(exports, "createAccuracyFn", { enumerable: true, get: function () { return shapleyValue_1.createAccuracyFn; } });
Object.defineProperty(exports, "applyCredit", { enumerable: true, get: function () { return shapleyValue_1.applyCredit; } });
Object.defineProperty(exports, "summarize", { enumerable: true, get: function () { return shapleyValue_1.summarize; } });
// ============================================================
// MULTI-ROUND DIALOG OPTIMIZATION
// ============================================================
var multiRoundDialog_1 = require("./ensemble/multiRoundDialog");
Object.defineProperty(exports, "MultiRoundDialogOptimizer", { enumerable: true, get: function () { return multiRoundDialog_1.MultiRoundDialogOptimizer; } });
Object.defineProperty(exports, "dialogOptimizer", { enumerable: true, get: function () { return multiRoundDialog_1.dialogOptimizer; } });
// ============================================================
// SCIENCE ADAPTER (Google DeepMind Skills)
// ============================================================
var scienceAdapter_1 = require("./integrations/scienceAdapter");
Object.defineProperty(exports, "executeScienceQuery", { enumerable: true, get: function () { return scienceAdapter_1.executeScienceQuery; } });
Object.defineProperty(exports, "routeScienceQuery", { enumerable: true, get: function () { return scienceAdapter_1.routeScienceQuery; } });
Object.defineProperty(exports, "isScienceQuery", { enumerable: true, get: function () { return scienceAdapter_1.isScienceQuery; } });
Object.defineProperty(exports, "detectScienceDomain", { enumerable: true, get: function () { return scienceAdapter_1.detectScienceDomain; } });
Object.defineProperty(exports, "scienceTools", { enumerable: true, get: function () { return scienceAdapter_1.scienceTools; } });
Object.defineProperty(exports, "RESEARCH_TEMPLATES", { enumerable: true, get: function () { return scienceAdapter_1.RESEARCH_TEMPLATES; } });
// ============================================================
// CONVENIENCE: Create a router instance
// ============================================================
const advancedRouter_2 = require("./routing/advancedRouter");
const providerConfig_2 = require("./providers/providerConfig");
const costTracker_2 = require("./cost/costTracker");
const memoryTree_2 = require("./memory/memoryTree");
const ensemble_2 = require("./ensemble");
function createA3MRouter(options) {
    const costTracker = new costTracker_2.CostTracker();
    const memoryTree = new memoryTree_2.MemoryTree();
    const router = {
        route: advancedRouter_2.routeQuery,
        routeBatch: advancedRouter_2.routeBatch,
        recommendForTask: advancedRouter_2.recommendForTask,
        getAvailableProviders: providerConfig_2.getAvailableProviders,
        healthCheck: providerConfig_2.healthCheck,
        costTracker,
        memoryTree,
        ensemble: new ensemble_2.EnsembleOrchestrator(null), // Lazy initialization or pass router instance
        options: options || {},
    };
    // Properly link the orchestrator back to the router methods
    router.ensemble.router = router;
    return router;
}
// Default export
exports.default = createA3MRouter;
//# sourceMappingURL=index.js.map