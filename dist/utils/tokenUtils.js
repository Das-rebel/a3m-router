"use strict";
/**
 * Token counting utilities for provider cost estimation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
exports.estimateTokens = estimateTokens;
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