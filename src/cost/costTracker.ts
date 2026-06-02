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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// BudgetEnforcer
// ---------------------------------------------------------------------------

export class BudgetEnforcer extends EventEmitter {
  budgets = new Map<string, BudgetConfig>();
  spend = new Map<string, SpendRecord>();

  // Default alert thresholds: 50%, 80%, 100%
  static DEFAULT_THRESHOLDS = [0.5, 0.8, 1.0];

  constructor() {
    super();
  }

  // ---- Configuration ----

  /**
   * Set budget for an API key
   */
  setBudget(apiKey: string, monthlyLimit: number, options?: { alertThresholds?: number[]; hardCap?: boolean }): void {
    const config: BudgetConfig = {
      apiKey,
      monthlyLimit,
      alertThresholds: options?.alertThresholds ?? BudgetEnforcer.DEFAULT_THRESHOLDS,
      hardCap: options?.hardCap ?? false,
    };

    this.budgets.set(apiKey, config);

    // Initialize spend record if not exists
    if (!this.spend.has(apiKey)) {
      this.spend.set(apiKey, {
        apiKey,
        spent: 0,
        budget: monthlyLimit,
        remaining: monthlyLimit,
        resetDate: this.getNextResetDate(),
        alertEmitted: new Set(),
      });
    }
  }

  /**
   * Get current budget config for an API key
   */
  getBudgetConfig(apiKey: string): BudgetConfig | undefined {
    return this.budgets.get(apiKey);
  }

  /**
   * Remove budget config (stops tracking)
   */
  removeBudget(apiKey: string): void {
    this.budgets.delete(apiKey);
    this.spend.delete(apiKey);
  }

  // ---- Budget Checking ----

  /**
   * Check if a request is allowed within budget
   */
  checkBudget(apiKey: string, additionalCost: number): BudgetCheckResult {
    // Auto-initialize if no budget set (permissive default)
    if (!this.budgets.has(apiKey)) {
      return {
        allowed: true,
        remaining: Infinity,
      };
    }

    // Check for reset
    this.checkAndReset(apiKey);

    const record = this.spend.get(apiKey)!;
    const config = this.budgets.get(apiKey)!;

    const projectedSpend = record.spent + additionalCost;

    // Check if would exceed budget
    if (projectedSpend > record.budget) {
      if (config.hardCap) {
        return {
          allowed: false,
          reason: `Budget exceeded. Spent: ${record.spent} cents, Budget: ${record.budget} cents, Additional: ${additionalCost} cents`,
          remaining: record.remaining,
        };
      }

      // Soft cap: allow but warn
      this.emit('budget:warning', {
        apiKey,
        threshold: 1.0,
        spent: record.spent,
        budget: record.budget,
        remaining: record.remaining,
        message: `Soft cap: Budget would be exceeded by ${projectedSpend - record.budget} cents`,
      });
    }

    return {
      allowed: true,
      remaining: record.remaining - additionalCost,
    };
  }

  // ---- Spend Recording ----

  /**
   * Record spend for an API key
   */
  recordSpend(apiKey: string, cost: number): void {
    // Auto-initialize if no budget set
    if (!this.budgets.has(apiKey)) {
      return; // No budget to track
    }

    // Check for reset
    this.checkAndReset(apiKey);

    const record = this.spend.get(apiKey)!;
    const config = this.budgets.get(apiKey)!;
    const previousSpent = record.spent;

    record.spent += cost;
    record.remaining = record.budget - record.spent;

    // Check thresholds
    const utilization = record.spent / record.budget;
    for (const threshold of config.alertThresholds ?? BudgetEnforcer.DEFAULT_THRESHOLDS) {
      const thresholdKey = Math.round(threshold * 1000);
      if (!record.alertEmitted.has(thresholdKey)) {
        const previousUtilization = previousSpent / record.budget;
        if (utilization >= threshold && previousUtilization < threshold) {
          record.alertEmitted.add(thresholdKey);
          this.emit('budget:warning', {
            apiKey,
            threshold,
            spent: record.spent,
            budget: record.budget,
            remaining: record.remaining,
            message: `Budget ${Math.round(threshold * 100)}% threshold reached`,
          });
        }
      }
    }

    // Fire 100% event if budget exceeded (for hard cap tracking)
    if (record.spent >= record.budget && previousSpent < record.budget) {
      this.emit('budget:exceeded', {
        apiKey,
        spent: record.spent,
        budget: record.budget,
        remaining: 0,
      });
    }
  }

  // ---- Spend Queries ----

  /**
   * Get current spend record for an API key
   */
  getSpend(apiKey: string): SpendRecord | undefined {
    if (!this.spend.has(apiKey)) {
      return undefined;
    }
    const record = { ...this.spend.get(apiKey)! };
    // Convert Set to Array for serialization
    record.alertEmitted = Array.from(record.alertEmitted as Set<number>);
    return record;
  }

  /**
   * Get all spend records
   */
  getAllSpend(): SpendRecord[] {
    return Array.from(this.spend.values()).map((record) => {
      const copy = { ...record };
      copy.alertEmitted = Array.from(record.alertEmitted as Set<number>);
      return copy;
    });
  }

  // ---- Budget Management ----

  /**
   * Reset budget for an API key (manual reset)
   */
  resetBudget(apiKey: string): void {
    if (!this.spend.has(apiKey)) {
      return;
    }
    const record = this.spend.get(apiKey)!;
    record.spent = 0;
    record.remaining = record.budget;
    record.resetDate = this.getNextResetDate();
    (record.alertEmitted as Set<number>).clear();
  }

  /**
   * Reset all budgets
   */
  resetAll(): void {
    for (const record of this.spend.values()) {
      record.spent = 0;
      record.remaining = record.budget;
      record.resetDate = this.getNextResetDate();
      (record.alertEmitted as Set<number>).clear();
    }
  }

  /**
   * Update monthly limit for an API key
   */
  updateLimit(apiKey: string, monthlyLimit: number): void {
    if (!this.budgets.has(apiKey)) {
      this.setBudget(apiKey, monthlyLimit);
      return;
    }

    const config = this.budgets.get(apiKey)!;
    config.monthlyLimit = monthlyLimit;

    const record = this.spend.get(apiKey)!;
    const oldBudget = record.budget;
    record.budget = monthlyLimit;
    record.remaining = monthlyLimit - record.spent;

    // Re-check if any thresholds are now exceeded
    const utilization = record.spent / record.budget;
    for (const threshold of config.alertThresholds ?? BudgetEnforcer.DEFAULT_THRESHOLDS) {
      const thresholdKey = Math.round(threshold * 1000);
      if (utilization >= threshold) {
        (record.alertEmitted as Set<number>).add(thresholdKey);
      } else {
        (record.alertEmitted as Set<number>).delete(thresholdKey);
      }
    }
  }

  // ---- Internal Helpers ----

  /**
   * Check if reset is needed and perform it
   */
  checkAndReset(apiKey: string): void {
    const record = this.spend.get(apiKey)!;
    if (this.isResetDue(record.resetDate)) {
      record.spent = 0;
      record.remaining = record.budget;
      record.resetDate = this.getNextResetDate();
      (record.alertEmitted as Set<number>).clear();
    }
  }

  /**
   * Check if monthly reset is due
   */
  isResetDue(resetDate: Date): boolean {
    const now = new Date();
    return now >= resetDate;
  }

  /**
   * Get next monthly reset date
   */
  getNextResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Get days until next reset
   */
  getDaysUntilReset(apiKey: string): number | undefined {
    const record = this.spend.get(apiKey);
    if (!record) return undefined;

    const now = Date.now();
    const resetMs = record.resetDate.getTime();
    return Math.max(0, Math.ceil((resetMs - now) / (1000 * 60 * 60 * 24)));
  }
}

// ---------------------------------------------------------------------------
// Convenience Factory
// ---------------------------------------------------------------------------

export function createBudgetEnforcer(): BudgetEnforcer {
  return new BudgetEnforcer();
}

// ---------------------------------------------------------------------------
// Error Class for Hard Cap Violations
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  apiKey: string;
  spent: number;
  budget: number;
  remaining: number;

  constructor(apiKey: string, spent: number, budget: number) {
    const message = `Budget exceeded for API key ${apiKey}. Spent: ${spent} cents, Budget: ${budget} cents`;
    super(message);
    this.name = 'BudgetExceededError';
    this.apiKey = apiKey;
    this.spent = spent;
    this.budget = budget;
    this.remaining = budget - spent;
  }
}