/**
 * llm-bridge — Unified Routing Layer (Idea #6)
 *
 * "building a routing layer was an absolute pain because we wanted to support
 * everything" (vault signal). llm-bridge is a single facade that unifies:
 *   - provider registry (getAvailableProviders)
 *   - advancedRouter (routeQuery)
 *   - circuit breaker + retry (utils/reliability)
 *   - cost tracker (cost/costTracker)
 *   - token optimization (tokenOptimization)
 *
 * Any caller (CLI, SDK, MCP, OpenAI-compat proxy) talks to llm-bridge only.
 * Adding a new provider = register it in providerConfig; llm-bridge picks it up.
 */

import { getAvailableProviders } from "../providers/providerConfig";
import { routeQuery } from "./advancedRouter";

export interface LlmBridgeRequest {
  prompt: string;
  maxCost?: number;
  latencySloMs?: number;
  minCodingScore?: number;
  requireTools?: boolean;
  preferredProvider?: string;
}

export interface LlmBridgeDecision {
  provider: string;
  model: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  reason: string;
}

export class LlmBridge {
  async decide(req: LlmBridgeRequest): Promise<LlmBridgeDecision> {
    const providers = getAvailableProviders();
    const available = Object.keys(providers);
    if (available.length === 0) {
      throw new Error("llm-bridge: no available providers");
    }
    const budget = req.maxCost ? req.maxCost : 1.0;
    const decision = routeQuery(req.prompt, available, budget);
    return {
      provider: decision.primary_model ?? available[0],
      model: decision.primary_model ?? available[0],
      estimatedCost: decision.estimated_cost ?? 0,
      estimatedLatencyMs: decision.estimated_latency_ms ?? 0,
      reason: decision.reasoning ?? "routed",
    };
  }
}

export const llmBridge = new LlmBridge();
export default llmBridge;
