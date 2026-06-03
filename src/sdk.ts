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

import {
  routeQuery,
  extractQueryFeatures,
  routeBatch,
  recommendForTask,
} from './routing/advancedRouter';
import { createProxyServer } from './server/proxyServer';

// ============================================================
// Types
// ============================================================

export interface RoutingResult {
  /** Selected model identifier (e.g. "groq/llama-3.3-70b-versatile") */
  model: string;
  /** Cost tier classification */
  tier: 'free' | 'cheap' | 'mid' | 'premium';
  /** Estimated cost in USD */
  cost: number;
  /** Complexity score 0.0–1.0 */
  complexity: number;
  /** Human-readable reasoning for the selection */
  reasoning: string;
  /** Alternative models in priority order */
  fallbackModels: string[];
  /** Whether the selected model is free */
  isFree: boolean;
  /** Whether this is classified as an expert-level query */
  isExpert: boolean;
}

export interface QueryFeatures {
  complexity: number;
  length: number;
  has_code: boolean;
  has_math: boolean;
  is_multilingual: boolean;
  is_translation: boolean;
  is_creative: boolean;
  requires_reasoning: boolean;
  is_security: boolean;
  is_devops: boolean;
  is_data: boolean;
  detected_domain: string;
  domain_score: number;
}

export interface A3MRouterConfig {
  /** Default model to use when routing is ambiguous */
  defaultModel?: string;
  /** Maximum cost per query in USD (routes to cheaper models if exceeded) */
  maxCostPerQuery?: number;
  /** Prefer fast responses over higher quality */
  preferSpeedOverQuality?: boolean;
  /** Restrict routing to these provider IDs */
  providers?: string[];
}

// ============================================================
// A3MRouter SDK Class
// ============================================================

export class A3MRouter {
  private config: A3MRouterConfig;
  private _proxyURL: string | null = null;

  constructor(config: A3MRouterConfig = {}) {
    this.config = config;
  }

  /**
   * Route a query — returns model selection without executing it.
   *
   * @param query - The user prompt to route
   * @returns Routing decision with model, tier, cost, complexity
   */
  route(query: string): RoutingResult {
    const features = extractQueryFeatures(query);
    const result = routeQuery(query, this.config.providers);

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
  routeBatch(queries: string[]): RoutingResult[] {
    routeBatch(queries); // warm the internal cache
    return queries.map((q) => this.route(q));
  }

  /**
   * Get model recommendation for a task description.
   *
   * @param task - Task description (e.g. "code generation", "summarization")
   * @returns Routing decision
   */
  recommend(task: string): RoutingResult {
    recommendForTask(task);
    return this.route(task);
  }

  /**
   * Start the OpenAI-compatible proxy server.
   *
   * @param port - Port to listen on (default: 8787)
   * @returns The proxy base URL (e.g. "http://localhost:8787/v1")
   */
  async serve(port: number = 8787): Promise<string> {
    createProxyServer(port);
    this._proxyURL = `http://localhost:${port}/v1`;
    return this._proxyURL;
  }

  /**
   * Get the proxy URL. Available after serve() is called,
   * otherwise returns the default.
   */
  get proxyURL(): string {
    return this._proxyURL || 'http://localhost:8787/v1';
  }

  /**
   * Extract features from a query for debugging or analysis.
   *
   * @param query - The user prompt to analyze
   * @returns Detailed feature breakdown
   */
  analyze(query: string): { complexity: number; length: number; has_code: boolean; requires_reasoning: boolean; is_multilingual: boolean; is_translation: boolean; domain: string | null; intent: string; detected_language: string | null; wordCount: number } {
    return extractQueryFeatures(query);
  }

  /**
   * Classify a complexity score into a named tier.
   */
  private classifyTier(
    complexity: number,
  ): 'free' | 'cheap' | 'mid' | 'premium' {
    if (complexity < 0.20) return 'free';
    if (complexity < 0.45) return 'cheap';
    if (complexity < 0.65) return 'mid';
    return 'premium';
  }
}

/**
 * Convenience: create an A3MRouter instance.
 *
 * @param config - Optional configuration
 * @returns Configured A3MRouter instance
 */
export function createSDK(config?: A3MRouterConfig): A3MRouter {
  return new A3MRouter(config);
}
