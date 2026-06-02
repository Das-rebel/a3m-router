/**
 * A3M Router - Budget Enforcer
 *
 * Hard budget enforcement for API key spend management:
 * - Track spend per API key with monthly reset
 * - Check budget before each request
 * - Emit alerts at configurable thresholds (50%, 80%, 100%)
 * - Support hard cap (reject requests) or soft cap (warn only)
 * - In-memory storage (Redis backup can be added later)
 */
import { EventEmitter } from 'events';
export interface BudgetCheckResult {
    allowed: boolean;
    remaining: number;
    reason?: string;
}
export interface SpendRecord {
    apiKey: string;
    spent: number;
    budget: number;
    remaining: number;
    resetDate: Date;
    alertEmitted: number[] | Set<number>;
}
export interface BudgetConfig {
    apiKey: string;
    monthlyLimit: number;
    alertThresholds?: number[];
    hardCap?: boolean;
}
export declare class BudgetEnforcer extends EventEmitter {
    budgets: Map<string, BudgetConfig>;
    spend: Map<string, SpendRecord>;
    static DEFAULT_THRESHOLDS: number[];
    constructor();
    /**
     * Set budget for an API key
     */
    setBudget(apiKey: string, monthlyLimit: number, options?: {
        alertThresholds?: number[];
        hardCap?: boolean;
    }): void;
    /**
     * Get current budget config for an API key
     */
    getBudgetConfig(apiKey: string): BudgetConfig | undefined;
    /**
     * Remove budget config (stops tracking)
     */
    removeBudget(apiKey: string): void;
    /**
     * Check if a request is allowed within budget
     */
    checkBudget(apiKey: string, additionalCost: number): BudgetCheckResult;
    /**
     * Record spend for an API key
     */
    recordSpend(apiKey: string, cost: number): void;
    /**
     * Get current spend record for an API key
     */
    getSpend(apiKey: string): SpendRecord | undefined;
    /**
     * Get all spend records
     */
    getAllSpend(): SpendRecord[];
    /**
     * Reset budget for an API key (manual reset)
     */
    resetBudget(apiKey: string): void;
    /**
     * Reset all budgets
     */
    resetAll(): void;
    /**
     * Update monthly limit for an API key
     */
    updateLimit(apiKey: string, monthlyLimit: number): void;
    /**
     * Check if reset is needed and perform it
     */
    checkAndReset(apiKey: string): void;
    /**
     * Check if monthly reset is due
     */
    isResetDue(resetDate: Date): boolean;
    /**
     * Get next monthly reset date
     */
    getNextResetDate(): Date;
    /**
     * Get days until next reset
     */
    getDaysUntilReset(apiKey: string): number | undefined;
}
export declare function createBudgetEnforcer(): BudgetEnforcer;
export declare class BudgetExceededError extends Error {
    apiKey: string;
    spent: number;
    budget: number;
    remaining: number;
    constructor(apiKey: string, spent: number, budget: number);
}
