/**
 * Enhanced Shapley Value Calculator for Ensemble Credit Assignment
 * 
 * Incorporates game theory concepts for efficient and fair credit distribution:
 * 
 * 1. ETHNOCENTRISM (In-group Loyalty Adjustment):
 *    - Players (models) have historical loyalty biases toward certain partners
 *    - Models that collaborate successfully develop "trust bonds"
 *    - Loyalty increases marginal contribution of trusted partners
 *    - Math: L[i,j] = exponential moving avg of historical success(i with j)
 * 
 * 2. HANDICAP PRINCIPLE (Zahavi, 1975 - Costly Signaling):
 *    - Honest signals require costly investment
 *    - Models providing correct answers despite cost signal reliability
 *    - Math: H[i] = cost_i * reliability_i (handicap bonus)
 * 
 * 3. CORE SHAPLEY VALUE:
 *    - φ_i = Σ_{S⊆N\{i}} (|S|! * (n-|S|-1)! / n!) * (v(S∪{i}) - v(S))
 * 
 * Combined: φ_i* = α*Shapley_i + β*Loyalty_i + γ*Handicap_i
 * Where α + β + γ = 1 (normalized weights)
 */

export interface ShapleyConfig {
  nPermutations?: number;
  useMonteCarlo?: boolean;
  alpha?: number;  // Shapley weight (default 0.5)
  beta?: number;  // Loyalty/ethnocentrism weight (default 0.3)
  gamma?: number;  // Handicap weight (default 0.2)
}

export interface ModelContribution {
  modelId: string;
  shapleyValue: number;
  loyaltyValue: number;
  handicapValue: number;
  combinedCredit: number;
  marginalContributions: number[];
  timesSelected: number;
  averageMarginal: number;
  reliabilityScore: number;
  costInvested: number;
  ethnocentrismBias: number;
}

type AccuracyFunction = (modelIds: string[]) => number;

// ============ ETHNOCENTRISM: LOYALTY MATRIX ============

export interface LoyaltyConfig {
  decayRate?: number;       // EMA decay (0-1, higher = more recent)
  minInteractions?: number; // Min history before loyalty applies
}

const DEFAULT_LOYALTY: LoyaltyConfig = { decayRate: 0.9, minInteractions: 3 };

/**
 * Loyalty Matrix L[i][j] = loyalty of model i toward model j (0-1)
 * Models develop trust through successful collaborations
 */
export class LoyaltyMatrix {
  private matrix = new Map<string, Map<string, number>>();
  private counts = new Map<string, Map<string, number>>();
  private config: Required<LoyaltyConfig>;

  constructor(cfg: LoyaltyConfig = {}) {
    this.config = { ...DEFAULT_LOYALTY, ...cfg } as Required<LoyaltyConfig>;
  }

  /** Record successful collaboration between two models */
  recordSuccess(i: string, j: string, weight = 1): void {
    if (!this.matrix.has(i)) { this.matrix.set(i, new Map()); this.counts.set(i, new Map()); }
    if (!this.matrix.get(i)!.has(j)) { this.matrix.get(i)!.set(j, 0); this.counts.get(i)!.set(j, 0); }
    const prev = this.matrix.get(i)!.get(j)!;
    const cnt = this.counts.get(i)!.get(j)!;
    const ema = this.config.decayRate * prev + (1 - this.config.decayRate) * weight;
    this.matrix.get(i)!.set(j, ema);
    this.counts.get(i)!.set(j, cnt + 1);
  }

  /** Get loyalty of model i toward model j */
  getLoyalty(i: string, j: string): number {
    if (!this.matrix.has(i) || !this.matrix.get(i)!.has(j)) return 0;
    if (this.counts.get(i)!.get(j)! < this.config.minInteractions) return 0;
    return this.matrix.get(i)!.get(j)!;
  }

  /** Ethnocentrism = average loyalty toward all partners */
  ethnoCentrism(model: string, allModels: string[]): number {
    const loyalties = allModels.map(m => this.getLoyalty(model, m));
    const avg = loyalties.reduce((a, b) => a + b, 0) / Math.max(1, allModels.length);
    return Math.min(1, avg);
  }
}

// ============ HANDICAP PRINCIPLE: COSTLY SIGNALING ============

export interface HandicapConfig {
  costSensitivity?: number;    // How much cost affects bonus
  reliabilityWeight?: number;  // How much reliability affects bonus
  minCostThreshold?: number;   // Min cost for handicap signal
}

const DEFAULT_HANDICAP: HandicapConfig = { costSensitivity: 0.5, reliabilityWeight: 0.5, minCostThreshold: 0.0001 };

/**
 * Handicap Principle (Zahavi, 1975):
 * "A handicapping signal is honest because it is costly to produce"
 * 
 * Models spending more tokens on answers despite being correct signal reliability.
 * H[i] = cost_i * reliability_i (higher = more reliable despite cost)
 */
export class HandicapCalculator {
  private costs = new Map<string, number>();
  private correct = new Map<string, number>();
  private totals = new Map<string, number>();
  private config: Required<HandicapConfig>;

  constructor(cfg: HandicapConfig = {}) {
    this.config = { ...DEFAULT_HANDICAP, ...cfg } as Required<HandicapConfig>;
  }

  /** Record performance: cost spent and whether answer was correct */
  record(model: string, cost: number, isCorrect: boolean): void {
    this.costs.set(model, (this.costs.get(model) || 0) + cost);
    this.totals.set(model, (this.totals.get(model) || 0) + 1);
    if (isCorrect) this.correct.set(model, (this.correct.get(model) || 0) + 1);
  }

  /** Reliability = correct / total (prior probability of being right) */
  reliability(model: string): number {
    const total = this.totals.get(model) || 0;
    if (total === 0) return 0.5;  // Unknown = neutral
    return (this.correct.get(model) || 0) / total;
  }

  /** Average cost invested by model */
  avgCost(model: string): number {
    const total = this.totals.get(model) || 0;
    if (total === 0) return 0;
    return (this.costs.get(model) || 0) / total;
  }

  /**
   * Handicap bonus = honest signal of quality
   * H[i] = (cost_i - minCost) / maxCost * reliability_i
   * Higher cost investment + higher reliability = higher handicap
   */
  handicap(model: string, maxCost = 0.01): number {
    const cost = this.avgCost(model);
    if (cost < this.config.minCostThreshold) return 0;
    const rel = this.reliability(model);
    const costNorm = Math.min(1, cost / maxCost);
    // Honest signal: cost * reliability (costly and correct = reliable)
    return this.config.costSensitivity * costNorm * rel + 
           this.config.reliabilityWeight * rel;
  }
}

// ============ CORE SHAPLEY VALUE ============

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

/**
 * Exact Shapley calculation (factorial enumeration)
 * For n <= 6 models
 */
function exactShapley(
  modelIds: string[],
  accuracyFn: AccuracyFunction
): Map<string, number> {
  const n = modelIds.length;
  const shapley = new Map<string, number>();
  modelIds.forEach(m => shapley.set(m, 0));

  // All permutations via Heap's algorithm
  function permute(arr: string[], callback: (p: string[]) => void): void {
    function generate(idx: number): void {
      if (idx === arr.length) { callback([...arr]); return; }
      for (let i = idx; i < arr.length; i++) {
        [arr[idx], arr[i]] = [arr[i], arr[idx]];
        generate(idx + 1);
        [arr[idx], arr[i]] = [arr[i], arr[idx]];
      }
    }
    generate(0);
  }

  const permutations: string[][] = [];
  const work = [...modelIds];
  permute(work, p => permutations.push(p));

  for (const perm of permutations) {
    let acc = 0;
    const subset: string[] = [];
    for (let i = 0; i < perm.length; i++) {
      const model = perm[i];
      const newAcc = accuracyFn([...subset, model]);
      const marginal = newAcc - acc;
      const weight = factorial(subset.length) * factorial(n - subset.length - 1) / factorial(n);
      shapley.set(model, shapley.get(model)! + weight * marginal);
      subset.push(model);
      acc = newAcc;
    }
  }

  return shapley;
}

/**
 * Monte Carlo approximation for n > 6 models
 */
function monteCarloShapley(
  modelIds: string[],
  accuracyFn: AccuracyFunction,
  nPerms: number
): Map<string, number> {
  const n = modelIds.length;
  const shapley = new Map<string, number>();
  modelIds.forEach(m => shapley.set(m, 0));

  for (let iter = 0; iter < nPerms; iter++) {
    const perm = [...modelIds].sort(() => Math.random() - 0.5);
    let acc = 0;
    const subset: string[] = [];
    for (const model of perm) {
      const newAcc = accuracyFn([...subset, model]);
      const marginal = newAcc - acc;
      shapley.set(model, shapley.get(model)! + marginal);
      subset.push(model);
      acc = newAcc;
    }
  }

  // Average
  for (const [m, v] of shapley) shapley.set(m, v / nPerms);
  return shapley;
}

/**
 * Combined enhanced Shapley value with ethnocentrism and handicap
 * φ_i* = α*φ_i(Shapley) + β*ε_i(Ethnocentrism) + γ*H_i(Handicap)
 */
export function calculateEnhancedShapley(
  modelIds: string[],
  accuracyFn: AccuracyFunction,
  loyalty: LoyaltyMatrix,
  handicap: HandicapCalculator,
  cfg: ShapleyConfig = {}
): Map<string, ModelContribution> {
  const { alpha = 0.5, beta = 0.3, gamma = 0.2, nPermutations = 1000, useMonteCarlo = false } = cfg;
  const results = new Map<string, ModelContribution>();

  // 1. Core Shapley values
  const shapleyValues = (modelIds.length <= 6 && !useMonteCarlo)
    ? exactShapley(modelIds, accuracyFn)
    : monteCarloShapley(modelIds, accuracyFn, nPermutations);

  // 2. Normalize Shapley to [0,1]
  const shapSum = [...shapleyValues.values()].reduce((a, b) => a + b, 0);
  const maxShap = Math.max(...shapleyValues.values(), 0.001);

  // 3. Compute ethnocentrism and handicap for each model
  for (const model of modelIds) {
    const shap = shapleyValues.get(model)!;
    const ethn = loyalty.ethnoCentrism(model, modelIds);
    const hand = handicap.handicap(model);

    // Normalized values
    const normShap = shap / maxShap;
    const combined = alpha * normShap + beta * ethn + gamma * hand;

    results.set(model, {
      modelId: model,
      shapleyValue: shap,
      loyaltyValue: ethn,
      handicapValue: hand,
      combinedCredit: combined,
      marginalContributions: [],
      timesSelected: 0,
      averageMarginal: shap / Math.max(1, modelIds.length),
      reliabilityScore: handicap.reliability(model),
      costInvested: handicap.avgCost(model),
      ethnocentrismBias: ethn,
    });
  }

  // 4. Normalize combined credits to sum to 1
  const totalCredit = [...results.values()].reduce((s, r) => s + r.combinedCredit, 0);
  if (totalCredit > 0) {
    for (const [, r] of results) r.combinedCredit /= totalCredit;
  }

  return results;
}

/** Create ensemble accuracy function for Shapley calculation */
export function createAccuracyFn(
  groundTruth: string,
  getAnswer: (modelId: string) => string
): AccuracyFunction {
  return (subset: string[]) => {
    if (subset.length === 0) return 0;
    const votes: Record<string, number> = {};
    for (const m of subset) {
      const ans = getAnswer(m);
      votes[ans] = (votes[ans] || 0) + 1;
    }
    const majority = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return majority === groundTruth ? 1 : 0;
  };
}

/** Apply Shapley credit to voting weights */
export function applyCredit(
  contributions: Map<string, ModelContribution>,
  baseWeights: Record<string, number>,
  alpha = 0.5
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [model, contrib] of contributions) {
    const base = baseWeights[model] || 1.0;
    result[model] = (1 - alpha) * base + alpha * contrib.combinedCredit;
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  for (const k in result) result[k] /= sum;
  return result;
}

export interface ShapleySummary {
  totalCredit: number;
  perModel: ModelContribution[];
  bestContributor: string;
  worstContributor: string;
}

export function summarize(
  contributions: Map<string, ModelContribution>
): ShapleySummary {
  const sorted = [...contributions.values()].sort((a, b) => b.combinedCredit - a.combinedCredit);
  return {
    totalCredit: sorted.reduce((s, c) => s + c.combinedCredit, 0),
    perModel: sorted,
    bestContributor: sorted[0]?.modelId || 'none',
    worstContributor: sorted[sorted.length - 1]?.modelId || 'none',
  };
}

// Default export
export default { calculateEnhancedShapley, LoyaltyMatrix, HandicapCalculator, createAccuracyFn, applyCredit, summarize };