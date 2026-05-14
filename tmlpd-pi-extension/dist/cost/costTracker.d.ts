/**
 * TMLPD Cost Tracker
 *
 * Tracks real-time spending across all providers.
 * Supports per-model budgets, spending alerts, and cost analysis.
 */
export interface BudgetConfig {
    daily_limit?: number;
    monthly_limit?: number;
    per_model_limits?: Record<string, number>;
}
export interface CostAlert {
    type: "daily" | "monthly" | "model" | "budget";
    threshold: number;
    current: number;
    provider?: string;
    model?: string;
}
export interface CostSnapshot {
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    input_cost: number;
    output_cost: number;
    total_cost: number;
    timestamp: number;
}
export interface CostSummary {
    total_cost: number;
    by_provider: Record<string, number>;
    by_model: Record<string, number>;
    daily_costs: Record<string, number>;
    monthly_costs: Record<string, number>;
    request_count: number;
    token_count: {
        input: number;
        output: number;
    };
    average_cost_per_request: number;
}
export declare class CostTracker {
    private history;
    private budgets;
    private alerts;
    private alerts_callback;
    private daily_reset;
    private monthly_reset;
    constructor(budgets?: BudgetConfig);
    /**
     * Calculate cost for a model based on tokens
     */
    calculateCost(model: string, input_tokens: number, output_tokens: number): {
        input: number;
        output: number;
        total: number;
    };
    /**
     * Record a request's cost
     */
    record(provider: string, model: string, input_tokens: number, output_tokens: number): CostSnapshot;
    /**
     * Check budgets and trigger alerts
     */
    private checkBudgets;
    /**
     * Emit an alert via callback
     */
    private emitAlert;
    /**
     * Register alert callback
     */
    onAlert(callback: (alert: CostAlert) => void): void;
    /**
     * Get comprehensive cost summary
     */
    getSummary(): CostSummary;
    /**
     * Get remaining budget
     */
    getRemainingBudget(): {
        daily: number | null;
        monthly: number | null;
        per_model: Record<string, number>;
    };
    /**
     * Reset cost history
     */
    reset(): void;
    /**
     * Export cost data for analysis
     */
    export(): CostSnapshot[];
}
//# sourceMappingURL=costTracker.d.ts.map