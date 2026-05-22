"use strict";
/**
 * A3M Router TypeScript SDK
 *
 * Clean wrapper class providing a better DX than raw exports.
 *
 * Usage:
 *   import { A3MRouter } from 'adaptive-memory-multi-model-router/sdk';
 *
 *   const router = new A3MRouter();
 *
 *   // Route a query (no execution, just model selection)
 *   const decision = router.route("What is 2+2?");
 *   console.log(decision.model, decision.tier, decision.cost);
 *
 *   // Start the OpenAI-compatible proxy server
 *   const proxyURL = await router.serve(8787);
 *
 *   // Use with any OpenAI SDK
 *   import OpenAI from 'openai';
 *   const client = new OpenAI({ baseURL: router.proxyURL });
 *   const response = await client.chat.completions.create({
 *     model: 'auto',
 *     messages: [{ role: 'user', content: 'Hello' }]
 *   });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.A3MRouter = void 0;
exports.createSDK = createSDK;
const advancedRouter_1 = require("./routing/advancedRouter");
const proxyServer_1 = require("./server/proxyServer");
// ============================================================
// A3MRouter SDK Class
// ============================================================
class A3MRouter {
    config;
    _proxyURL = null;
    constructor(config = {}) {
        this.config = config;
    }
    /**
     * Route a query — returns model selection without executing it.
     *
     * @param query - The user prompt to route
     * @returns Routing decision with model, tier, cost, complexity
     */
    route(query) {
        const features = (0, advancedRouter_1.extractQueryFeatures)(query);
        const result = (0, advancedRouter_1.routeQuery)(query, this.config.providers);
        return {
            model: result.primary_model || 'unknown',
            tier: this.classifyTier(features.complexity),
            cost: result.estimated_cost || 0,
            complexity: features.complexity,
            reasoning: result.reasoning || '',
            fallbackModels: result.fallback_models || [],
            isFree: (result.estimated_cost || 0) === 0,
            isExpert: features.complexity >= 0.65,
        };
    }
    /**
     * Route multiple queries in batch.
     *
     * @param queries - Array of user prompts
     * @returns Array of routing decisions
     */
    routeBatch(queries) {
        (0, advancedRouter_1.routeBatch)(queries); // warm the internal cache
        return queries.map((q) => this.route(q));
    }
    /**
     * Get model recommendation for a task description.
     *
     * @param task - Task description (e.g. "code generation", "summarization")
     * @returns Routing decision
     */
    recommend(task) {
        (0, advancedRouter_1.recommendForTask)(task);
        return this.route(task);
    }
    /**
     * Start the OpenAI-compatible proxy server.
     *
     * @param port - Port to listen on (default: 8787)
     * @returns The proxy base URL (e.g. "http://localhost:8787/v1")
     */
    async serve(port = 8787) {
        (0, proxyServer_1.createProxyServer)(port);
        this._proxyURL = `http://localhost:${port}/v1`;
        return this._proxyURL;
    }
    /**
     * Get the proxy URL. Available after serve() is called,
     * otherwise returns the default.
     */
    get proxyURL() {
        return this._proxyURL || 'http://localhost:8787/v1';
    }
    /**
     * Extract features from a query for debugging or analysis.
     *
     * @param query - The user prompt to analyze
     * @returns Detailed feature breakdown
     */
    analyze(query) {
        return (0, advancedRouter_1.extractQueryFeatures)(query);
    }
    /**
     * Classify a complexity score into a named tier.
     */
    classifyTier(complexity) {
        if (complexity < 0.20)
            return 'free';
        if (complexity < 0.45)
            return 'cheap';
        if (complexity < 0.65)
            return 'mid';
        return 'premium';
    }
}
exports.A3MRouter = A3MRouter;
/**
 * Convenience: create an A3MRouter instance.
 *
 * @param config - Optional configuration
 * @returns Configured A3MRouter instance
 */
function createSDK(config) {
    return new A3MRouter(config);
}
//# sourceMappingURL=sdk.js.map