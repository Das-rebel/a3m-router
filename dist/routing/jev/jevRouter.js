"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_CONFIDENCE = void 0;
exports.loadWeights = loadWeights;
exports.resetWeightsCache = resetWeightsCache;
exports.optionTextForModel = optionTextForModel;
exports.jevRoute = jevRoute;
exports.jevRouteAsync = jevRouteAsync;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const advancedRouter_1 = require("../advancedRouter");
const optionAttention_1 = require("./optionAttention");
const remote_1 = require("./remote");
const WEIGHTS_PATHS = [
    path.join(__dirname, "weights", "jev-router-weights.json"), // dist copy
    path.join(__dirname, "..", "..", "..", "src", "routing", "jev", "weights", "jev-router-weights.json"), // repo fallback
];
/** Below this top-probability, defer to the System 2 heuristic router. */
exports.MIN_CONFIDENCE = 0.22;
let cachedWeights;
function loadWeights() {
    if (cachedWeights !== undefined)
        return cachedWeights;
    try {
        for (const p of WEIGHTS_PATHS) {
            if (fs.existsSync(p)) {
                cachedWeights = JSON.parse(fs.readFileSync(p, "utf8"));
                return cachedWeights;
            }
        }
        cachedWeights = null;
    }
    catch {
        cachedWeights = null;
    }
    return cachedWeights;
}
/** For tests / hot-reload of retrained weights. */
function resetWeightsCache() {
    cachedWeights = undefined;
    (0, optionAttention_1.resetQueryCache)();
}
/**
 * Build the option text for a model profile. Option text is what the engine
 * embeds — providers unseen at training time are still scored through their
 * strengths/tier description.
 */
function optionTextForModel(model, profile) {
    const strengths = (profile.strengths || []).slice(0, 6).join(",");
    const cost = profile.cost_per_1k_input != null
        ? ((profile.cost_per_1k_input + (profile.cost_per_1k_output || 0)) / 2).toFixed(4)
        : "?";
    return `${model} provider:${profile.providerName || "?"} type:${profile.type || "api"} strengths:${strengths} quality:${profile.quality_score ?? "?"} cost:${cost}`;
}
/**
 * Single-pass Jev routing decision. Returns a RouteDecision shaped exactly
 * like advancedRouter.routeQuery so it is a drop-in replacement.
 */
function jevRoute(prompt, available_models, budget_multiplier = 1.0) {
    // 1. Remote backend (openjev-sglang / typesafe) takes precedence if configured
    if ((0, remote_1.remoteConfigured)()) {
        // remoteDecide is async; jevRoute is sync to match routeQuery's contract.
        // Remote mode is exposed via jevRouteAsync below.
    }
    const weights = loadWeights();
    if (!weights)
        return fallbackRoute(prompt, available_models, budget_multiplier, "no weights");
    // 2. Candidate pool — mirror routeQuery's candidate selection
    const profiles = getModelProfilesSafe();
    const candidateNames = (available_models && available_models.length
        ? available_models
        : Object.keys(profiles)).filter((n) => profiles[n]);
    if (candidateNames.length === 0)
        return fallbackRoute(prompt, available_models, budget_multiplier, "no candidates");
    const t0 = Date.now();
    const options = candidateNames.map((m) => optionTextForModel(m, profiles[m]));
    const { probs, top } = (0, optionAttention_1.scoreOptions)(prompt, options, weights);
    const complexity = (0, optionAttention_1.scoreScalar)(prompt, weights);
    const { value: needsCode, prob: codeProb } = (0, optionAttention_1.scoreNoul)(prompt, "requires code generation", weights);
    const elapsed = Date.now() - t0;
    const bestIdx = top[0]?.index ?? -1;
    const bestProb = top[0]?.prob ?? 0;
    const jev = {
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
    if (bestProb < exports.MIN_CONFIDENCE || bestIdx < 0) {
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
        estimated_cost: ((profile.cost_per_1k_input || 0) + (profile.cost_per_1k_output || 0)) / 2,
        estimated_latency_ms: profile.latency_ms || 500,
        provider_type: profile.type,
        jev,
    };
}
/** Async variant with remote backend support. */
async function jevRouteAsync(prompt, available_models, budget_multiplier = 1.0) {
    if ((0, remote_1.remoteConfigured)()) {
        const profiles = getModelProfilesSafe();
        const candidates = (available_models && available_models.length
            ? available_models
            : Object.keys(profiles)).filter((n) => profiles[n]);
        const remote = await (0, remote_1.remoteDecide)({
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
                const idx = candidates.findIndex((m) => choice.value.startsWith(m + " "));
                const primary = idx >= 0 ? candidates[idx] : candidates.find((c) => choice.value.includes(c));
                if (primary) {
                    const profile = profiles[primary];
                    return {
                        primary_model: primary,
                        fallback_models: [],
                        confidence: choice.prob,
                        reasoning: `jev remote (${remote.backend}) [${remote.elapsed_ms}ms]`,
                        estimated_cost: ((profile.cost_per_1k_input || 0) + (profile.cost_per_1k_output || 0)) / 2,
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
const advancedRouter_2 = require("../advancedRouter");
function getModelProfilesSafe() {
    // MODEL_PROFILES is populated by the first routeQuery call (profile cache).
    if (Object.keys(advancedRouter_2.MODEL_PROFILES).length === 0)
        (0, advancedRouter_1.routeQuery)("warmup");
    return advancedRouter_2.MODEL_PROFILES;
}
function fallbackRoute(prompt, available_models, budget_multiplier, why) {
    const d = (0, advancedRouter_1.routeQuery)(prompt, available_models, budget_multiplier);
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
//# sourceMappingURL=jevRouter.js.map