/**
 * Mock token utilities for testing providerRetry.
 * Replaces the broken import from src/utils/tokenUtils (file doesn't exist).
 */

export function countTokens(text: string, _model?: string): number {
  if (!text || text.length === 0) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

export function estimateTokens(text: string): number {
  return countTokens(text);
}

export function estimateCost(_promptTokens: number, _completionTokens: number, _model: string): number {
  return 0;
}

export const MODEL_COSTS: Record<string, { input_per_1k: number; output_per_1k: number }> = {
  'gpt-4o': { input_per_1k: 2.50, output_per_1k: 10.00 },
};
