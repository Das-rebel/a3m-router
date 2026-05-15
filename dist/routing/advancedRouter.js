"use strict";
/**
 * TMLPD Advanced Routing - RouteLLM Style
 *
 * Learned routing based on arXiv:2404.06035 (RouteLLM)
 * Balances cost-quality tradeoff with confidence-based model selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PROFILES = void 0;
exports.extractQueryFeatures = extractQueryFeatures;
exports.routeQuery = routeQuery;
exports.routeBatch = routeBatch;
exports.recommendForTask = recommendForTask;
exports.updateModelProfile = updateModelProfile;
const tokenUtils_1 = require("../utils/tokenUtils");
// Pre-configured model profiles
exports.MODEL_PROFILES = {
    "openai/gpt-4o": {
        name: "openai/gpt-4o",
        provider: "openai",
        cost_per_1k_input: 2.50,
        cost_per_1k_output: 10.00,
        latency_ms: 2000,
        quality_score: 0.95,
        strengths: ["reasoning", "coding", "analysis"],
        context_window: 128000
    },
    "openai/gpt-4o-mini": {
        name: "openai/gpt-4o-mini",
        provider: "openai",
        cost_per_1k_input: 0.15,
        cost_per_1k_output: 0.60,
        latency_ms: 500,
        quality_score: 0.85,
        strengths: ["fast", "coding"],
        context_window: 128000
    },
    "anthropic/claude-3.5-sonnet": {
        name: "anthropic/claude-3.5-sonnet",
        provider: "anthropic",
        cost_per_1k_input: 3.00,
        cost_per_1k_output: 15.00,
        latency_ms: 2500,
        quality_score: 0.96,
        strengths: ["reasoning", "creative", "analysis"],
        context_window: 200000
    },
    "anthropic/claude-3-haiku": {
        name: "anthropic/claude-3-haiku",
        provider: "anthropic",
        cost_per_1k_input: 0.25,
        cost_per_1k_output: 1.25,
        latency_ms: 500,
        quality_score: 0.80,
        strengths: ["fast", "simple"],
        context_window: 200000
    },
    "google/gemini-2.0-flash": {
        name: "google/gemini-2.0-flash",
        provider: "google",
        cost_per_1k_input: 0.00, // Free
        cost_per_1k_output: 0.00,
        latency_ms: 800,
        quality_score: 0.88,
        strengths: ["fast", "multilingual"],
        context_window: 1000000
    },
    "google/gemini-1.5-pro": {
        name: "google/gemini-1.5-pro",
        provider: "google",
        cost_per_1k_input: 1.25,
        cost_per_1k_output: 5.00,
        latency_ms: 1500,
        quality_score: 0.92,
        strengths: ["reasoning", "long-context"],
        context_window: 2000000
    },
    "groq/llama-3.3-70b": {
        name: "groq/llama-3.3-70b",
        provider: "groq",
        cost_per_1k_input: 0.59,
        cost_per_1k_output: 0.79,
        latency_ms: 400,
        quality_score: 0.82,
        strengths: ["fast", "coding"],
        context_window: 128000
    },
    "cerebras/llama-3.3-70b": {
        name: "cerebras/llama-3.3-70b",
        provider: "cerebras",
        cost_per_1k_input: 0.60,
        cost_per_1k_output: 0.60,
        latency_ms: 350,
        quality_score: 0.82,
        strengths: ["fast", "budget"],
        context_window: 128000
    },
    "local/llama-3.3-70b": {
        name: "local/llama-3.3-70b",
        provider: "ollama",
        cost_per_1k_input: 0.00,
        cost_per_1k_output: 0.00,
        latency_ms: 100,
        quality_score: 0.75,
        strengths: ["privacy", "free"],
        context_window: 128000
    }
};
/**
 * Extract features from prompt for routing decision
 */
function extractQueryFeatures(prompt) {
    const lower = prompt.toLowerCase();
    // Code patterns
    const code_indicators = [
        "function", "class ", "def ", "import ", "const ", "let ",
        "python", "javascript", "typescript", "java", "cpp", "rust",
        "```", "=>", "->", "async", "await"
    ];
    const has_code = code_indicators.some(pattern => lower.includes(pattern));
    // Math patterns (expanded for unicode and common notation)
    const math_indicators = [
        "equation", "formula", "calculate", "sqrt", "^", "log",
        "sin", "cos", "tan", "integral", "derivative", "$", "math",
        "∫", "∂", "∑", "∏", "√", "∞", "π", "θ", "β",
        "dx", "dy", "dz", "=", "solver", "compute"
    ];
    const has_math = math_indicators.some(pattern => prompt.includes(pattern));
    // Multilingual
    const lang_patterns = [
        /[\u4e00-\u9fff]/, // Chinese
        /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese
        /[\uac00-\ud7af]/, // Korean
        /[а-яА-Я]/, // Russian
        /[áéíóúñ]/ // Spanish accented
    ];
    const is_multilingual = lang_patterns.some(pattern => pattern.test(prompt));
    // Creative writing
    const creative_indicators = [
        "write a", "story", "poem", "creative", "imagine",
        "describe", "explain in", "tell me", "narrative"
    ];
    const is_creative = creative_indicators.some(pattern => lower.includes(pattern));
    // Reasoning
    const reasoning_indicators = [
        "explain", "why", "because", "therefore", "thus",
        "analyze", "think", "consider", "reason", "logic"
    ];
    const requires_reasoning = reasoning_indicators.some(pattern => lower.includes(pattern));
    // Complexity estimation based on length and patterns
    const tokens = (0, tokenUtils_1.countTokens)(prompt, "gpt-4o");
    let complexity = 0.3;
    if (tokens > 1000)
        complexity += 0.2;
    if (has_code)
        complexity += 0.15;
    if (has_math)
        complexity += 0.2;
    if (requires_reasoning)
        complexity += 0.15;
    if (is_creative)
        complexity += 0.1;
    complexity = Math.min(1.0, complexity);
    return {
        complexity,
        length: tokens,
        has_code,
        has_math,
        is_multilingual,
        is_creative,
        requires_reasoning
    };
}
/**
 * Score model fit for query
 */
function scoreModelFit(model, features) {
    let score = model.quality_score * 0.4; // Base quality
    // Strengths matching
    if (features.has_code && model.strengths.includes("coding")) {
        score += 0.2;
    }
    if (features.requires_reasoning && model.strengths.includes("reasoning")) {
        score += 0.2;
    }
    if (features.is_creative && model.strengths.includes("creative")) {
        score += 0.15;
    }
    if (features.is_multilingual && model.strengths.includes("multilingual")) {
        score += 0.15;
    }
    if (features.has_math && model.strengths.includes("analysis")) {
        score += 0.15;
    }
    // Speed bonus for simple tasks
    if (features.complexity < 0.4 && model.latency_ms < 1000) {
        score += 0.1;
    }
    return score;
}
/**
 * Cost efficiency score (inverse of normalized cost)
 */
function costEfficiency(model, features) {
    const avg_cost = (model.cost_per_1k_input + model.cost_per_1k_output) / 2;
    // For simple tasks, prioritize cost efficiency
    if (features.complexity < 0.5) {
        return (1 - Math.min(avg_cost / 10, 1)) * 0.6;
    }
    // For complex tasks, deprioritize cost
    return (1 - Math.min(avg_cost / 10, 1)) * 0.2;
}
/**
 * RouteLLM-style learned routing decision
 */
function routeQuery(prompt, available_models, budget_multiplier = 1.0) {
    const features = extractQueryFeatures(prompt);
    const candidate_names = available_models || Object.keys(exports.MODEL_PROFILES);
    const candidates = candidate_names
        .filter(name => exports.MODEL_PROFILES[name])
        .map(name => {
        const profile = exports.MODEL_PROFILES[name];
        const quality = scoreModelFit(profile, features);
        const cost = costEfficiency(profile, features);
        return {
            name,
            profile,
            quality_score: quality,
            cost_score: cost,
            total_score: quality + cost
        };
    });
    // Sort by total score (quality vs cost tradeoff based on complexity)
    const complexity_bias = features.complexity > 0.6 ? 0.7 : 0.3; // High complexity = quality bias
    candidates.sort((a, b) => {
        const score_a = a.quality_score * complexity_bias + a.cost_score * (1 - complexity_bias);
        const score_b = b.quality_score * complexity_bias + b.cost_score * (1 - complexity_bias);
        return score_b - score_a;
    });
    const primary = candidates[0];
    const secondary = candidates.slice(1, 3);
    // Calculate confidence based on score gap
    let confidence = 0.5;
    if (candidates.length > 1) {
        const gap = primary.total_score - candidates[1].total_score;
        confidence = Math.min(0.95, 0.5 + gap * 2);
    }
    // Build reasoning
    const reasons = [];
    if (features.has_code)
        reasons.push("code detected");
    if (features.requires_reasoning)
        reasons.push("reasoning needed");
    if (features.complexity > 0.6)
        reasons.push("high complexity");
    if (features.is_multilingual)
        reasons.push("multilingual");
    const estimated_tokens = features.length * 1.5; // rough completion estimate
    const estimated_cost = (0, tokenUtils_1.estimateCost)(features.length, estimated_tokens, primary.name);
    return {
        primary_model: primary.name,
        fallback_models: secondary.map(c => c.name),
        confidence,
        reasoning: `Selected ${primary.profile.provider}/${primary.name.split("/")[1]} for ${reasons.join(", ") || "general query"}`,
        estimated_cost: estimated_cost * budget_multiplier,
        estimated_latency_ms: primary.profile.latency_ms
    };
}
/**
 * Batch routing for multiple prompts
 */
function routeBatch(prompts, options) {
    const decisions = prompts.map(p => routeQuery(p));
    if (options?.same_model && decisions.length > 0) {
        // Use first decision's model for all (for batch consistency)
        const primary_model = decisions[0].primary_model;
        decisions.forEach(d => {
            d.primary_model = primary_model;
            d.fallback_models = decisions[0].fallback_models;
        });
    }
    if (options?.max_cost_per_prompt) {
        decisions.forEach(d => {
            if (d.estimated_cost > options.max_cost_per_prompt) {
                // Route to cheaper alternative
                const cheap = Object.entries(exports.MODEL_PROFILES)
                    .find(([name, p]) => p.cost_per_1k_input < 0.5);
                if (cheap) {
                    d.primary_model = cheap[0];
                    d.reasoning = `Budget-limited routing to ${cheap[1].provider}`;
                }
            }
        });
    }
    return decisions;
}
/**
 * Get model recommendation for task type
 */
function recommendForTask(task) {
    const features = extractQueryFeatures(task);
    const decision = routeQuery(task);
    // Return primary + fallbacks
    return [decision.primary_model, ...decision.fallback_models];
}
/**
 * Update model profile from execution feedback (online learning)
 */
function updateModelProfile(model_name, actual_latency_ms, actual_cost, quality_rating // 0-1
) {
    const profile = exports.MODEL_PROFILES[model_name];
    if (!profile)
        return;
    // Exponential moving average update
    const alpha = 0.2; // Learning rate
    profile.latency_ms = profile.latency_ms * (1 - alpha) + actual_latency_ms * alpha;
    profile.quality_score = profile.quality_score * (1 - alpha) + quality_rating * alpha;
    // Adjust cost perception
    const actual_cost_per_1k = actual_cost * 1000;
    const current_avg_cost = (profile.cost_per_1k_input + profile.cost_per_1k_output) / 2;
    // Keep stored costs as reference, but note actual in profile
    console.log(`[RouteLLM] Updated ${model_name}: latency=${profile.latency_ms.toFixed(0)}ms, quality=${profile.quality_score.toFixed(2)}`);
}
exports.default = {
    extractQueryFeatures,
    routeQuery,
    routeBatch,
    recommendForTask,
    updateModelProfile,
    MODEL_PROFILES: exports.MODEL_PROFILES
};
//# sourceMappingURL=advancedRouter.js.map