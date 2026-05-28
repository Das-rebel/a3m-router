/**
 * Token counting utilities for provider cost estimation
 */

export function countTokens(text: string): number {
  if (!text) return 0;
  // Rough estimate: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

export function estimateTokens(text: string): number {
  return countTokens(text);
}
