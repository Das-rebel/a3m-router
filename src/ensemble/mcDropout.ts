/**
 * Monte Carlo Dropout for Uncertainty Estimation
 *
 * Adds MC Dropout to the routing engine to estimate uncertainty
 * and make more reliable routing decisions.
 *
 * Key concepts:
 * - Run N stochastic forward passes with dropout enabled
 * - Compute variance across passes as uncertainty signal
 * - Use uncertainty to trigger fallback or ensemble mode
 */

import { MIN_CONFIDENCE } from '../routing/jev/jevRouter';

export interface MCResult {
  mean: number;
  variance: number;
  uncertainty: number;
  predictions: number[];
  isUncertain: boolean;
}

export interface DropoutConfig {
  dropoutRate: number;
  nSamples: number;
  uncertaintyThreshold: number;
}

/**
 * Monte Carlo Dropout Router.
 *
 * Implements MC Dropout for uncertainty-aware routing decisions.
 * During inference, randomly mask a subset of weights and run
 * multiple stochastic forward passes. The variance across passes
 * is used as an uncertainty estimate.
 */
export class MCDropoutRouter {
  private dropoutRate: number;
  private nSamples: number;
  private uncertaintyThreshold: number;

  constructor(config?: Partial<DropoutConfig>) {
    this.dropoutRate = config?.dropoutRate ?? 0.1;
    this.nSamples = config?.nSamples ?? 10;
    this.uncertaintyThreshold = config?.uncertaintyThreshold ?? 0.2;
  }

  /**
   * Run MC Dropout for uncertainty estimation.
   *
   * @param prompt - The task prompt
   * @param weights - Base attention weights
   * @returns MCResult with mean, variance, and uncertainty
   */
  async routeWithUncertainty(
    prompt: string,
    weights: Record<string, number>
  ): Promise<MCResult> {
    const predictions: number[] = [];

    for (let i = 0; i < this.nSamples; i++) {
      const maskedWeights = this.applyDropout(weights);
      const logits = this.computeLogits(prompt, maskedWeights);
      const probs = this.softmax(logits);
      predictions.push(Math.max(...probs));
    }

    const mean = this.mean(predictions);
    const variance = this.variance(predictions);
    const uncertainty = Math.sqrt(variance);

    return {
      mean,
      variance,
      uncertainty,
      predictions,
      isUncertain: uncertainty > this.uncertaintyThreshold,
    };
  }

  /**
   * Apply dropout mask to weights.
   *
   * During inference, randomly mask a fraction of weights with
   * probability p, then scale by 1/(1-p) to maintain expected value.
   */
  private applyDropout(weights: Record<string, number>): Record<string, number> {
    const masked: Record<string, number> = {};

    for (const [key, value] of Object.entries(weights)) {
      if (Math.random() < this.dropoutRate) {
        masked[key] = 0;
      } else {
        masked[key] = value / (1 - this.dropoutRate);
      }
    }

    return masked;
  }

  /**
   * Compute logits from prompt and masked weights.
   *
   * In production, this would call the actual OptionAttention engine.
   * For now, returns mock logits based on weights.
   */
  private computeLogits(
    prompt: string,
    weights: Record<string, number>
  ): number[] {
    // Placeholder: integrate with optionAttention.ts in production
    return Object.keys(weights).map((key) => weights[key] || 0);
  }

  /**
   * Convert logits to probability distribution using softmax.
   */
  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map((x) => Math.exp(x - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((x) => x / sum);
  }

  /**
   * Compute mean of array.
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Compute variance of array.
   */
  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const m = this.mean(values);
    return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  }

  /**
   * Determine if routing decision is uncertain.
   */
  isRoutingUncertain(uncertainty: number): boolean {
    return uncertainty > this.uncertaintyThreshold;
  }

  /**
   * Get confidence adjusted by uncertainty.
   */
  getAdjustedConfidence(meanConfidence: number, uncertainty: number): number {
    return Math.max(0, meanConfidence - uncertainty);
  }
}

export default MCDropoutRouter;
