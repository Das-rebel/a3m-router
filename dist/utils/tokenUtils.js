"use strict";
/**
 * Token counting utilities for provider cost estimation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
exports.estimateTokens = estimateTokens;
exports.estimateCost = estimateCost;

// Simple model cost lookup (subset of MODEL_COSTS from costTracker)
var MODEL_COST_MAP = {
  'gpt-4o': { input: 10.0, output: 30.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-4': { input: 15.0, output: 75.0 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 3.50, output: 10.50 },
  'llama-3-70b': { input: 0.59, output: 0.79 },
  'mixtral-8x7b': { input: 0.24, output: 0.24 },
  'mistral-large': { input: 2.0, output: 6.0 },
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'groq-mixtral': { input: 0.24, output: 0.24 },
  'groq-llama': { input: 0.59, output: 0.79 },
  'default': { input: 1.0, output: 5.0 }
};

function estimateCost(inputTokens, outputTokens, modelName) {
  var model = MODEL_COST_MAP[modelName] || MODEL_COST_MAP['default'];
  var inputCost = (inputTokens / 1000) * model.input;
  var outputCost = (outputTokens / 1000) * model.output;
  return inputCost + outputCost;
}

function countTokens(text) {
    if (!text)
        return 0;
    // Rough estimate: ~4 chars per token for English text
    return Math.ceil(text.length / 4);
}
function estimateTokens(text) {
    return countTokens(text);
}
//# sourceMappingURL=tokenUtils.js.map