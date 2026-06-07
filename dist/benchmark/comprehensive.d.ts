/**
 * A3M Router — Comprehensive Local Benchmark Suite
 *
 * Tests 4 dimensions where A3M claims leadership:
 *   1. Routing Accuracy (tier assignment)
 *   2. Memory Persistence (cross-session recall)
 *   3. Robustness (failover, circuit breaker, provider health)
 *   4. Cost Efficiency (vs always-premium baseline)
 *
 * Run: npx ts-node src/benchmark/comprehensive.ts
 */
interface RoutingResult {
    query: string;
    actualTier: string;
    routedTier: string;
    model: string;
    complexity: number;
    cost: number;
    correct: boolean;
    offByOne: boolean;
}
declare function runRoutingAccuracy(): {
    results: RoutingResult[];
    summary: any;
};
interface MemoryTestResult {
    test: string;
    passed: boolean;
    details: string;
}
declare function runMemoryBenchmark(): {
    results: MemoryTestResult[];
    summary: any;
};
interface RobustnessResult {
    test: string;
    passed: boolean;
    details: string;
}
declare function runRobustnessBenchmark(): {
    results: RobustnessResult[];
    summary: any;
};
interface CostResult {
    scenario: string;
    a3mCost: number;
    alwaysPremiumCost: number;
    savings: number;
    savingsPct: number;
}
declare function runCostBenchmark(): {
    results: CostResult[];
    summary: any;
};
export declare function runComprehensiveBenchmark(): void;
export { runRoutingAccuracy, runMemoryBenchmark, runRobustnessBenchmark, runCostBenchmark };
