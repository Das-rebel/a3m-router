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

import * as fs from "fs";
import * as path from "path";
import {
  routeQuery,
  type RouteDecision,
} from "../advancedRouter";
import {
  scoreOptions,
  scoreScalar,
  scoreNoul,
  resetQueryCache,
  type OptionAttentionWeights,
} from "./optionAttention";
import { remoteConfigured, remoteDecide } from "./remote";
import type { JevResponse } from "./types";

const WEIGHTS_PATHS = [
  path.join(__dirname, "weights", "jev-router-weights.json"),           // dist copy
  path.join(__dirname, "..", "..", "..", "src", "routing", "jev", "weights", "jev-router-weights.json"), // repo fallback
];

/** Below this top-probability, defer to the System 2 heuristic router. */
export const MIN_CONFIDENCE = 0.22;

let cachedWeights: OptionAttentionWeights | null | undefined;

export function loadWeights(): OptionAttentionWeights | null {
  if (cachedWeights !== undefined) return cachedWeights;
  try {
    for (const p of WEIGHTS_PATHS) {
      if (fs.existsSync(p)) {
        cachedWeights = JSON.parse(fs.readFileSync(p, "utf8")) as OptionAttentionWeights;
        return cachedWeights;
      }
    }
    cachedWeights = null;
  } catch {
    cachedWeights = null;
  }
  return cachedWeights;
}

/** For tests / hot-reload of retrained weights. */
export function resetWeightsCache(): void {
  cachedWeights = undefined;
  resetQueryCache();
}

/**
 * Build the option text for a model profile. Option text is what the engine
 * embeds — providers unseen at training time are still scored through their
 * strengths/tier description.
 */
export function optionTextForModel(model: string, profile: {
  providerName?: string;
  strengths?: string[];
  quality_score?: number;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
  type?: string;
}): string {
  const strengths = (profile.strengths || []).slice(0, 6).join(",");
  const cost =
    profile.cost_per_1k_input != null
      ? ((profile.cost_per_1k_input + (profile.cost_per_1k_output || 0)) / 2).toFixed(4)
      : "?";
  return `${model} provider:${profile.providerName || "?"} type:${profile.type || "api"} strengths:${strengths} quality:${profile.quality_score ?? "?"} cost:${cost}`;
}

/**
 * Single-pass Jev routing decision. Returns a RouteDecision shaped exactly
 * like advancedRouter.routeQuery so it is a drop-in replacement.
 */
export function jevRoute(
  prompt: string,
  available_models?: string[],
  budget_multiplier: number = 1.0
): RouteDecision & { jev?: JevResponse } {
  // 1. Remote backend (openjev-sglang / typesafe) takes precedence if configured
  if (remoteConfigured()) {
    // remoteDecide is async; jevRoute is sync to match routeQuery's contract.
    // Remote mode is exposed via jevRouteAsync below.
  }

  const weights = loadWeights();
  if (!weights) return fallbackRoute(prompt, available_models, budget_multiplier, "no weights");

  // 2. Candidate pool — mirror routeQuery's candidate selection
  const profiles = getModelProfilesSafe();
  const candidateNames = (available_models && available_models.length
    ? available_models
    : Object.keys(profiles)
  ).filter((n) => profiles[n]);
  if (candidateNames.length === 0)
    return fallbackRoute(prompt, available_models, budget_multiplier, "no candidates");

  const t0 = Date.now();
  const options = candidateNames.map((m) => optionTextForModel(m, profiles[m]));
  const { probs, top } = scoreOptions(prompt, options, weights);
  const complexity = scoreScalar(prompt, weights);
  const { value: needsCode, prob: codeProb } = scoreNoul(prompt, "requires code generation", weights);
  const elapsed = Date.now() - t0;

  const bestIdx = top[0]?.index ?? -1;
  const bestProb = top[0]?.prob ?? 0;

  const jev: JevResponse = {
    answers: [
      {
        type: "choice",
        key: "provider",
        value: bestIdx >= 0 ? candidateNames[bestIdx] : "",
        prob: bestProb,
        top: top.map((t) => ({ option: candidateNames[t.index], prob: t.prob })),
      },
      { type: "score", key: "complexity", value: complexity },
      { type: "noul", key: "needs_code", value: needsCode, prob: codeProb },
    ],
    elapsed_ms: elapsed,
    backend: "local-weights",
  };

  // 3. Confidence guard → System 2 fallback
  if (bestProb < MIN_CONFIDENCE || bestIdx < 0) {
    const fb = fallbackRoute(prompt, available_models, budget_multiplier, `low confidence ${bestProb.toFixed(2)}`);
    return { ...fb, jev };
  }

  const primary = candidateNames[bestIdx];
  const profile = profiles[primary];
  const fallbacks = top.slice(1, 3).map((t) => candidateNames[t.index]);

  return {
    primary_model: primary,
    fallback_models: fallbacks,
    confidence: bestProb,
    reasoning: `jev single-pass (distilled): p=${bestProb.toFixed(3)} complexity=${complexity.toFixed(2)} needs_code=${needsCode}(${codeProb.toFixed(2)}) [${elapsed}ms]`,
    estimated_cost:
      ((profile.cost_per_1k_input || 0) + (profile.cost_per_1k_output || 0)) / 2,
    estimated_latency_ms: profile.latency_ms || 500,
    provider_type: profile.type,
    jev,
  };
}

/** Async variant with remote backend support. */
export async function jevRouteAsync(
  prompt: string,
  available_models?: string[],
  budget_multiplier: number = 1.0
): Promise<RouteDecision & { jev?: JevResponse }> {
  if (remoteConfigured()) {
    const profiles = getModelProfilesSafe();
    const candidates = (available_models && available_models.length
      ? available_models
      : Object.keys(profiles)
    ).filter((n) => profiles[n]);
    const remote = await remoteDecide({
      state: prompt,
      questions: [
        {
          type: "choice",
          key: "provider",
          description: "best model for this query",
          options: candidates.map((m) => optionTextForModel(m, profiles[m])),
        },
      ],
    });
    if (remote) {
      const choice = remote.answers[0];
      if (choice && choice.type === "choice") {
        // map option text back to model name
        const idx = candidates.findIndex((m) =>
          choice.value.startsWith(m + " ")
        );
        const primary = idx >= 0 ? candidates[idx] : candidates.find((c) => choice.value.includes(c));
        if (primary) {
          const profile = profiles[primary];
          return {
            primary_model: primary,
            fallback_models: [],
            confidence: choice.prob,
            reasoning: `jev remote (${remote.backend}) [${remote.elapsed_ms}ms]`,
            estimated_cost:
              ((profile.cost_per_1k_input || 0) + (profile.cost_per_1k_output || 0)) / 2,
            estimated_latency_ms: profile.latency_ms || 500,
            provider_type: profile.type,
            jev: remote,
          };
        }
      }
    }
  }
  return jevRoute(prompt, available_models, budget_multiplier);
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

import { MODEL_PROFILES } from "../advancedRouter";

function getModelProfilesSafe(): Record<string, {
  providerName: string;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  latency_ms: number;
  quality_score: number;
  strengths: string[];
  type: string;
}> {
  // MODEL_PROFILES is populated by the first routeQuery call (profile cache).
  if (Object.keys(MODEL_PROFILES).length === 0) routeQuery("warmup");
  return MODEL_PROFILES as Record<string, never>;
}

function fallbackRoute(
  prompt: string,
  available_models: string[] | undefined,
  budget_multiplier: number,
  why: string
): RouteDecision & { jev?: JevResponse } {
  const d = routeQuery(prompt, available_models, budget_multiplier);
  return {
    ...d,
    reasoning: `system2-fallback (${why}): ${d.reasoning}`,
    jev: {
      answers: [],
      elapsed_ms: 0,
      backend: "fallback-heuristic",
    },
  };
}
