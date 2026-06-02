/**
 * Log-scale cost utilities for A3M Router
 * 
 * Provides better differentiation across cost ranges:
 * - Free models get score 1.0
 * - $0.05/1K vs $0.10/1K get meaningfully different scores
 * - $0.10/1K vs $10/1K get much larger differentiation than linear scaling
 */

/**
 * Log-scale cost score (0-1, lower cost = higher score)
 * Uses log scale to better differentiate mid-range costs
 * 
 * @param costPer1K - Cost per 1K tokens (input or output)
 * @param minCost - Minimum cost boundary (default: $0.01)
 * @param maxCost - Maximum cost boundary (default: $10)
 * @returns Score from 0 to 1 (higher = cheaper)
 */
export function logScaleCostScore(costPer1K: number, minCost = 0.01, maxCost = 10): number {
  // Handle free/zero cost models
  if (costPer1K <= 0) return 1.0;
  
  // Normalize to log scale between minCost and maxCost
  const logMin = Math.log(minCost);
  const logMax = Math.log(maxCost);
  const logCost = Math.log(Math.max(costPer1K, minCost));
  
  // Inverse: lower cost = higher score
  return 1 - ((logCost - logMin) / (logMax - logMin));
}

/**
 * Combined cost score (input + output weighted)
 * 
 * @param inputCostPer1K - Input cost per 1K tokens
 * @param outputCostPer1K - Output cost per 1K tokens
 * @param outputWeight - Weight for output cost (default: 0.5)
 * @returns Combined log-scale cost score
 */
export function combinedCostScore(inputCostPer1K: number, outputCostPer1K: number, outputWeight = 0.5): number {
  const inputScore = logScaleCostScore(inputCostPer1K);
  const outputScore = logScaleCostScore(outputCostPer1K);
  return inputScore * (1 - outputWeight) + outputScore * outputWeight;
}

/**
 * Cost margin loss for training
 * Encourages routing to significantly cheaper models
 * 
 * @param selectedCost - Cost of selected model
 * @param alternativeCost - Cost of alternative model  
 * @param margin - Minimum margin threshold (default: 0.1 = 10%)
 * @returns Loss value (0 if no significant saving available)
 */
export function costMarginLoss(
  selectedCost: number,
  alternativeCost: number,
  margin = 0.1
): number {
  // No loss if alternative is not cheaper
  if (alternativeCost <= selectedCost) return 0;
  
  // Calculate saving ratio: how much cheaper is alternative?
  const savingRatio = (alternativeCost - selectedCost) / alternativeCost;
  
  // Loss is how much we missed the margin threshold
  return Math.max(0, margin - savingRatio);
}

/**
 * Quality-adjusted cost score
 * Normalizes cost score by model quality to prioritize
 * cost-efficient models that are also high quality
 * 
 * @param costScore - Raw log-scale cost score (0-1)
 * @param qualityScore - Model quality score (0-1)
 * @returns Quality-adjusted cost score
 */
export function qualityAdjustedCostScore(costScore: number, qualityScore: number): number {
  // Combine: prefer high quality + low cost
  return costScore * (0.3 + 0.7 * qualityScore);
}

/**
 * Budget-aware cost penalty
 * Applies stronger penalty for expensive models when budget is tight
 * 
 * @param costPer1K - Cost per 1K tokens
 * @param budgetMultiplier - Budget pressure (0.5 = tight, 1.0 = normal, 2.0 = generous)
 * @returns Adjusted cost score
 */
export function budgetAwareCostScore(costPer1K: number, budgetMultiplier: number = 1.0): number {
  const baseScore = logScaleCostScore(costPer1K);
  
  // Adjust penalty based on budget
  // Low budget (multiplier < 1) → stronger preference for cheap
  // High budget (multiplier > 1) → more tolerant of expensive
  const adjustment = Math.pow(baseScore, 1 / budgetMultiplier);
  
  return adjustment;
}

// ============================================================
// VALIDATION TESTS (can be run with: node src/utils/costUtils.ts)
// ============================================================

export function runValidationTests(): void {
  const tests = [
    // [cost, expectedBehavior]
    [0, 1.0, "free model → score 1.0"],
    [0.01, 1.0, "$0.01 → score 1.0 (at min boundary)"],
    [0.05, 0.62, "$0.05 → high score (cheap)"],
    [0.10, 0.52, "$0.10 → moderate score"],
    [1.00, 0.30, "$1.00 → lower score"],
    [10.0, 0.0, "$10.00 → score 0.0 (at max boundary)"],
    
    // Check relative ordering
    [0.05, "higher than 0.10", "verification"],
    [0.10, "higher than 1.00", "verification"],
    [1.00, "higher than 10.00", "verification"],
  ];
  
  console.log("Log-Scale Cost Score Validation:");
  console.log("=".repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const cost = test[0] as number;
    const expected = test[1];
    const desc = test[2] as string;
    
    const score = logScaleCostScore(cost);
    
    if (typeof expected === "number") {
      const ok = Math.abs(score - expected) < 0.02;
      console.log(`  ${ok ? "✓" : "✗"} ${desc}: cost=$${cost} → score=${score.toFixed(3)} (expected ~${expected})`);
      if (ok) passed++; else failed++;
    } else {
      // Verification test
      const compareCost = parseFloat(desc.split(" ")[0]);
      const compareScore = logScaleCostScore(compareCost);
      const ok = score > compareScore;
      console.log(`  ${ok ? "✓" : "✗"} ${desc}: ${cost} > ${compareCost} (${score.toFixed(3)} > ${compareScore.toFixed(3)})`);
      if (ok) passed++; else failed++;
    }
  }
  
  console.log("=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
}

// Run if called directly
if (require.main === module) {
  runValidationTests();
}