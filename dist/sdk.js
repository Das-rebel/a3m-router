"use strict";
/**
 * A3M Router TypeScript SDK
 *
 * Clean wrapper class providing a better DX than raw exports.
 *
 * Usage:
 *   const { A3MRouter } = require('adaptive-memory-multi-model-router/sdk');
 *   const router = new A3MRouter();
 *   const decision = router.route("What is 2+2?");
 *   console.log(decision.model, decision.tier, decision.cost);
 */

const advancedRouter = require("./routing/advancedRouter");
const proxyServer = require("./server/proxyServer");

// ============================================================
// A3MRouter SDK Class
// ============================================================

class A3MRouter {
  constructor(config = {}) {
    this.config = config;
    this._proxyURL = null;
  }

  /**
   * Route a query — returns model selection without executing it.
   *
   * @param {string} query - The user prompt to route
   * @returns {object} Routing decision with model, tier, cost, complexity
   */
  route(query) {
    const features = advancedRouter.extractQueryFeatures(query);
    const result = advancedRouter.routeQuery(query, this.config.providers);

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
   * @param {string[]} queries - Array of user prompts
   * @returns {object[]} Array of routing decisions
   */
  routeBatch(queries) {
    advancedRouter.routeBatch(queries); // warm the internal cache
    return queries.map((q) => this.route(q));
  }

  /**
   * Get model recommendation for a task description.
   *
   * @param {string} task - Task description
   * @returns {object} Routing decision
   */
  recommend(task) {
    advancedRouter.recommendForTask(task);
    return this.route(task);
  }

  /**
   * Start the OpenAI-compatible proxy server.
   *
   * @param {number} port - Port to listen on (default: 8787)
   * @returns {Promise<string>} The proxy base URL
   */
  async serve(port = 8787) {
    proxyServer.createProxyServer(port);
    this._proxyURL = `http://localhost:${port}/v1`;
    return this._proxyURL;
  }

  /**
   * Get the proxy URL. Available after serve() is called.
   */
  get proxyURL() {
    return this._proxyURL || 'http://localhost:8787/v1';
  }

  /**
   * Extract features from a query for debugging or analysis.
   *
   * @param {string} query - The user prompt to analyze
   * @returns {object} Detailed feature breakdown
   */
  analyze(query) {
    return advancedRouter.extractQueryFeatures(query);
  }

  /**
   * Classify a complexity score into a named tier.
   */
  classifyTier(complexity) {
    if (complexity < 0.20) return 'free';
    if (complexity < 0.45) return 'cheap';
    if (complexity < 0.65) return 'mid';
    return 'premium';
  }
}

/**
 * Convenience: create an A3MRouter instance.
 *
 * @param {object} config - Optional configuration
 * @returns {A3MRouter} Configured instance
 */
function createSDK(config) {
  return new A3MRouter(config);
}

module.exports = { A3MRouter, createSDK };
module.exports.default = A3MRouter;
