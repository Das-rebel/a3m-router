"use strict";
/**
 * TMLPD Token Utilities
 *
 * Token counting, cost estimation, and context management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_COSTS = void 0;
exports.countTokens = countTokens;
exports.estimateCost = estimateCost;
exports.estimateCostFromText = estimateCostFromText;
exports.getModelCost = getModelCost;
exports.listModelsByCost = listModelsByCost;
exports.findCheapestModels = findCheapestModels;
// Current provider rates (2024-2025)
exports.MODEL_COSTS = {
    // OpenAI
    "gpt-4o": { input_per_1k: 2.50, output_per_1k: 10.00 },
    "gpt-4o-mini": { input_per_1k: 0.15, output_per_1k: 0.60 },
    "gpt-4-turbo": { input_per_1k: 10.00, output_per_1k: 30.00 },
    "gpt-3.5-turbo": { input_per_1k: 0.50, output_per_1k: 1.50 },
    // Anthropic
    "claude-3.5-sonnet": { input_per_1k: 3.00, output_per_1k: 15.00 },
    "claude-3-opus": { input_per_1k: 15.00, output_per_1k: 75.00 },
    "claude-3-haiku": { input_per_1k: 0.25, output_per_1k: 1.25 },
    // Google
    "gemini-2.0-flash": { input_per_1k: 0.00, output_per_1k: 0.00 }, // Free
    "gemini-1.5-pro": { input_per_1k: 1.25, output_per_1k: 5.00 },
    "gemini-1.5-flash": { input_per_1k: 0.075, output_per_1k: 0.30 },
    // Groq
    "groq/llama-3.3-70b": { input_per_1k: 0.59, output_per_1k: 0.79 },
    "groq/llama-3.1-8b": { input_per_1k: 0.05, output_per_1k: 0.08 },
    // Cerebras
    "cerebras/llama-3.3-70b": { input_per_1k: 0.60, output_per_1k: 0.60 },
    // Mistral
    "mistral-large": { input_per_1k: 2.00, output_per_1k: 6.00 },
    "mistral-small": { input_per_1k: 0.20, output_per_1k: 0.60 },
};
/**
 * Count tokens in text (approximate for English).
 * Based on ~1.3 tokens per word for typical English text.
 */
function countTokens(text, model = "gpt-4o") {
    if (!text || text.length === 0)
        return 0;
    // Use model-specific approximation if available
    // Otherwise use generic word-based estimate
    const words = text.trim().split(/\s+/).length;
    // Fine-tune based on model family
    if (model.includes("claude")) {
        // Anthropic models: ~1.5 tokens per word
        return Math.ceil(words * 1.5);
    }
    else if (model.includes("gemini")) {
        // Google: ~1.2 tokens per word (SentencePiece)
        return Math.ceil(words * 1.2);
    }
    else if (model.includes("llama")) {
        // Llama: ~1.4 tokens per word (BPE)
        return Math.ceil(words * 1.4);
    }
    // Default: ~1.3 tokens per word (GPT-4 average)
    return Math.ceil(words * 1.3);
}
/**
 * Estimate cost for a prompt/completion pair.
 */
function estimateCost(prompt_tokens, completion_tokens, model) {
    const costs = exports.MODEL_COSTS[model] || exports.MODEL_COSTS["gpt-4o"];
    const input_cost = (prompt_tokens / 1000) * costs.input_per_1k;
    const output_cost = (completion_tokens / 1000) * costs.output_per_1k;
    return input_cost + output_cost;
}
/**
 * Estimate cost from raw text (approximates both prompt and completion).
 */
function estimateCostFromText(prompt, completion, model) {
    const prompt_tokens = countTokens(prompt, model);
    // Completion typically has higher token density
    const completion_tokens = Math.ceil(countTokens(completion, model) * 1.2);
    return estimateCost(prompt_tokens, completion_tokens, model);
}
/**
 * Get cost info for a model.
 */
function getModelCost(model) {
    return exports.MODEL_COSTS[model] || exports.MODEL_COSTS["gpt-4o"];
}
/**
 * List all supported models with their costs.
 */
function listModelsByCost() {
    return Object.entries(exports.MODEL_COSTS)
        .map(([model, cost]) => ({
        model,
        input: cost.input_per_1k,
        output: cost.output_per_1k
    }))
        .sort((a, b) => (a.input + a.output) - (b.input + b.output));
}
/**
 * Find cheapest models for a given task.
 */
function findCheapestModels(task, count = 3) {
    const sorted = listModelsByCost();
    // Different profiles for different needs
    const profiles = {
        fast: sorted.filter(m => m.output < 1.0).slice(0, count).map(m => m.model),
        quality: sorted.filter(m => m.output > 10).slice(0, count).map(m => m.model),
        balanced: sorted.slice(0, count * 2).slice(count, count * 2).map(m => m.model),
        coding: sorted.filter(m => m.model.includes("codex") || m.model.includes("claude") || m.model.includes("llama")).slice(0, count).map(m => m.model)
    };
    return profiles[task] || profiles.balanced;
}
exports.default = {
    countTokens,
    estimateCost,
    estimateCostFromText,
    getModelCost,
    listModelsByCost,
    findCheapestModels,
    MODEL_COSTS: exports.MODEL_COSTS
};
//# sourceMappingURL=tokenUtils.js.map