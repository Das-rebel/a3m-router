/**
 * A3M Router - Budget Enforcer + Cost Tracker
 *
 * Hard budget enforcement for API key spend management:
 * - Track spend per API key with monthly reset
 * - Check budget before each request
 * - Emit alerts at configurable thresholds (50%, 80%, 100%)
 * - Support hard cap (reject requests) or soft cap (warn only)
 * - In-memory storage (Redis backup can be added later)
 * 
 * Plus legacy CostTracker for backward compatibility.
 */

import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetConfig {
  apiKey: string;
  monthlyLimit: number;
  alertThresholds?: number[];
  hardCap?: boolean;
}

export interface SpendRecord {
  apiKey: string;
  spent: number;
  budget: number;
  remaining: number;
  resetDate: Date;
  alertEmitted: number[] | Set<number>;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
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
      if (!(record.alertEmitted as Set<number>).has(thresholdKey)) {
        const previousUtilization = previousSpent / record.budget;
        if (utilization >= threshold && previousUtilization < threshold) {
          (record.alertEmitted as Set<number>).add(thresholdKey);
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

// ---------------------------------------------------------------------------
// CostTracker (legacy wrapper for backward compatibility)
// ---------------------------------------------------------------------------

interface CostSnapshot {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  timestamp: number;
}

interface CostSummary {
  total_cost: number;
  by_provider: Record<string, number>;
  by_model: Record<string, number>;
  daily_costs: Record<string, number>;
  monthly_costs: Record<string, number>;
  request_count: number;
  token_count: { input: number; output: number };
  average_cost_per_request: number;
}

const LEGACY_MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama-3.3-70b': { input: 0.1, output: 0.1 },
  'mistral-large-latest': { input: 2.0, output: 6.0 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
  'grok-2': { input: 2.0, output: 8.0 },
  'grok-2-mini': { input: 0.2, output: 0.8 },
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'glm-5': { input: 0.1, output: 0.3 },
  'glm-4': { input: 0.1, output: 0.3 },
};

export class CostTracker {
  private history: CostSnapshot[] = [];
  private budgets: { daily_limit?: number; monthly_limit?: number; per_model_limits?: Record<string, number> };
  private alerts: any[] = [];
  private alerts_callback: ((alert: any) => void) | null = null;
  private daily_reset: number;
  private monthly_reset: number;

  constructor(budgets: { daily_limit?: number; monthly_limit?: number; per_model_limits?: Record<string, number> } = {}) {
    this.budgets = budgets;
    const now = new Date();
    this.daily_reset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    this.monthly_reset = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  }

  calculateCost(model: string, input_tokens: number, output_tokens: number): { input: number; output: number; total: number } {
    const model_key = model.split('/').pop() || model;
    const rates = LEGACY_MODEL_COSTS[model_key] || { input: 1.0, output: 5.0 };
    const input_cost = (input_tokens / 1_000_000) * rates.input;
    const output_cost = (output_tokens / 1_000_000) * rates.output;
    return {
      input: Math.round(input_cost * 1000000) / 1000000,
      output: Math.round(output_cost * 1000000) / 1000000,
      total: Math.round((input_cost + output_cost) * 1000000) / 1000000,
    };
  }

  record(provider: string, model: string, input_tokens: number, output_tokens: number): CostSnapshot {
    const costs = this.calculateCost(model, input_tokens, output_tokens);
    const snapshot: CostSnapshot = {
      provider,
      model,
      input_tokens,
      output_tokens,
      input_cost: costs.input,
      output_cost: costs.output,
      total_cost: costs.total,
      timestamp: Date.now(),
    };
    this.history.push(snapshot);
    this.checkBudgets(snapshot);
    return snapshot;
  }

  private checkBudgets(snapshot: CostSnapshot): void {
    const summary = this.getSummary();
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    if (this.budgets.daily_limit) {
      const daily_cost = summary.daily_costs[today] || 0;
      if (daily_cost >= this.budgets.daily_limit * 0.9) {
        this.emitAlert({ type: 'daily', threshold: this.budgets.daily_limit, current: daily_cost });
      }
    }

    if (this.budgets.monthly_limit) {
      const monthly_cost = summary.monthly_costs[month] || 0;
      if (monthly_cost >= this.budgets.monthly_limit * 0.9) {
        this.emitAlert({ type: 'monthly', threshold: this.budgets.monthly_limit, current: monthly_cost });
      }
    }

    if (this.budgets.per_model_limits) {
      const model_limit = this.budgets.per_model_limits[snapshot.model];
      if (model_limit) {
        const model_cost = summary.by_model[snapshot.model] || 0;
        if (model_cost >= model_limit * 0.9) {
          this.emitAlert({ type: 'model', threshold: model_limit, current: model_cost, model: snapshot.model });
        }
      }
    }
  }

  private emitAlert(alert: any): void {
    const recent = this.alerts.find((a) => a.type === alert.type &&
      a.threshold === alert.threshold &&
      Date.now() - a._emitted_at < 3600000);
    if (recent) return;
    alert._emitted_at = Date.now();
    this.alerts.push(alert);
    if (this.alerts_callback) {
      this.alerts_callback(alert);
    }
  }

  onAlert(callback: (alert: any) => void): void {
    this.alerts_callback = callback;
  }

  getSummary(): CostSummary {
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);
    if (nowMs >= this.daily_reset) {
      this.daily_reset = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1).getTime();
    }
    if (nowMs >= this.monthly_reset) {
      this.monthly_reset = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1).getTime();
    }

    const by_provider: Record<string, number> = {};
    const by_model: Record<string, number> = {};
    const daily_costs: Record<string, number> = {};
    const monthly_costs: Record<string, number> = {};
    let total_cost = 0;
    let total_input_tokens = 0;
    let total_output_tokens = 0;

    for (const entry of this.history) {
      total_cost += entry.total_cost;
      total_input_tokens += entry.input_tokens;
      total_output_tokens += entry.output_tokens;
      by_provider[entry.provider] = (by_provider[entry.provider] || 0) + entry.total_cost;
      by_model[entry.model] = (by_model[entry.model] || 0) + entry.total_cost;
      const entry_date = new Date(entry.timestamp).toISOString().split('T')[0];
      const entry_month = entry_date.substring(0, 7);
      daily_costs[entry_date] = (daily_costs[entry_date] || 0) + entry.total_cost;
      monthly_costs[entry_month] = (monthly_costs[entry_month] || 0) + entry.total_cost;
    }

    return {
      total_cost: Math.round(total_cost * 1000000) / 1000000,
      by_provider,
      by_model,
      daily_costs,
      monthly_costs,
      request_count: this.history.length,
      token_count: { input: total_input_tokens, output: total_output_tokens },
      average_cost_per_request: this.history.length > 0
        ? Math.round((total_cost / this.history.length) * 1000000) / 1000000
        : 0,
    };
  }

  getRemainingBudget(): { daily: number | null; monthly: number | null; per_model: Record<string, number> } {
    const summary = this.getSummary();
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    return {
      daily: this.budgets.daily_limit
        ? Math.max(0, this.budgets.daily_limit - (summary.daily_costs[today] || 0))
        : null,
      monthly: this.budgets.monthly_limit
        ? Math.max(0, this.budgets.monthly_limit - (summary.monthly_costs[month] || 0))
        : null,
      per_model: this.budgets.per_model_limits
        ? Object.fromEntries(
            Object.entries(this.budgets.per_model_limits).map(([model, limit]) => [
              model,
              Math.max(0, limit - (summary.by_model[model] || 0)),
            ])
          )
        : {},
    };
  }

  reset(): void {
    this.history = [];
    this.alerts = [];
  }

  export(): CostSnapshot[] {
    return [...this.history];
  }

  // Alias for getSummary (backward compat)
  getStatus(): CostSummary {
    return this.getSummary();
  }
}