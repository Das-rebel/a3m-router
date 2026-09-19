/**
 * JevRouter — System One routing for A3M.
 *
 * Replaces the autoregressive/heuristic routing loop with a single-pass
 * calibrated decision (Jev interface pattern):
 *
 *   prompt ──► OptionAttention engine ──► { provider choice, complexity score,
 *                                            capability noul flags }
 *
 * The engine is distilled from A3M's own System 2 router (advancedRouter.ts):
 * tools/distill.mjs runs routeQuery over a synthetic prompt corpus and
 * tools/train_jev.py trains the ~25k-parameter option-attention weights.
 *
 * Confidence guard: if the top provider probability is below MIN_CONFIDENCE,
 * we fall back to the full heuristic router (System 2) — Jev decides the easy
 * 90%, the heavy router handles the hard 10%.
 */
import { type RouteDecision } from "../advancedRouter";
import { type OptionAttentionWeights } from "./optionAttention";
import type { JevResponse } from "./types";
/** Below this top-probability, defer to the System 2 heuristic router. */
export declare const MIN_CONFIDENCE = 0.22;
export declare function loadWeights(): OptionAttentionWeights | null;
/** For tests / hot-reload of retrained weights. */
export declare function resetWeightsCache(): void;
/**
 * Build the option text for a model profile. Option text is what the engine
 * embeds — providers unseen at training time are still scored through their
 * strengths/tier description.
 */
export declare function optionTextForModel(model: string, profile: {
    providerName?: string;
    strengths?: string[];
    quality_score?: number;
    cost_per_1k_input?: number;
    cost_per_1k_output?: number;
    type?: string;
}): string;
/**
 * Single-pass Jev routing decision. Returns a RouteDecision shaped exactly
 * like advancedRouter.routeQuery so it is a drop-in replacement.
 */
export declare function jevRoute(prompt: string, available_models?: string[], budget_multiplier?: number): RouteDecision & {
    jev?: JevResponse;
};
/** Async variant with remote backend support. */
export declare function jevRouteAsync(prompt: string, available_models?: string[], budget_multiplier?: number): Promise<RouteDecision & {
    jev?: JevResponse;
}>;
