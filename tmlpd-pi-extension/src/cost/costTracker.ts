/**
 * TMLPD Cost Tracker
 * 
 * Tracks real-time spending across all providers.
 * Supports per-model budgets, spending alerts, and cost analysis.
 */

// Cost per 1M tokens for known models (USD)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  // Google
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  // Groq
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  // Cerebras
  "llama-3.3-70b": { input: 0.1, output: 0.1 },
  // Mistral
  "mistral-large-latest": { input: 2.0, output: 6.0 },
  "mistral-small-latest": { input: 0.2, output: 0.6 },
  // xAI
  "grok-2": { input: 2.0, output: 8.0 },
  "grok-2-mini": { input: 0.2, output: 0.8 },
  // OpenRouter (varies by model)
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
  "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  // ZAI (default estimate)
  "glm-5": { input: 0.1, output: 0.3 },
  "glm-4": { input: 0.1, output: 0.3 },
};

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
  token_count: { input: number; output: number };
  average_cost_per_request: number;
}

export class CostTracker {
  private history: CostSnapshot[] = [];
  private budgets: BudgetConfig;
  private alerts: CostAlert[] = [];
  private alerts_callback: ((alert: CostAlert) => void) | null = null;
  private daily_reset: number;
  private monthly_reset: number;

  constructor(budgets: BudgetConfig = {}) {
    this.budgets = budgets;
    const now = new Date();
    this.daily_reset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    this.monthly_reset = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  }

  /**
   * Calculate cost for a model based on tokens
   */
  calculateCost(model: string, input_tokens: number, output_tokens: number): { input: number; output: number; total: number } {
    const model_key = model.split("/").pop() || model;
    const rates = MODEL_COSTS[model_key] || { input: 1.0, output: 5.0 }; // Default estimate

    const input_cost = (input_tokens / 1_000_000) * rates.input;
    const output_cost = (output_tokens / 1_000_000) * rates.output;

    return {
      input: Math.round(input_cost * 1000000) / 1000000, // 6 decimal precision
      output: Math.round(output_cost * 1000000) / 1000000,
      total: Math.round((input_cost + output_cost) * 1000000) / 1000000,
    };
  }

  /**
   * Record a request's cost
   */
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

  /**
   * Check budgets and trigger alerts
   */
  private checkBudgets(snapshot: CostSnapshot): void {
    const summary = this.getSummary();
    const today = new Date().toISOString().split("T")[0];
    const month = today.substring(0, 7);

    // Check daily budget
    if (this.budgets.daily_limit) {
      const daily_cost = summary.daily_costs[today] || 0;
      if (daily_cost >= this.budgets.daily_limit * 0.9) { // Alert at 90%
        this.emitAlert({
          type: "daily",
          threshold: this.budgets.daily_limit,
          current: daily_cost,
        });
      }
    }

    // Check monthly budget
    if (this.budgets.monthly_limit) {
      const monthly_cost = summary.monthly_costs[month] || 0;
      if (monthly_cost >= this.budgets.monthly_limit * 0.9) {
        this.emitAlert({
          type: "monthly",
          threshold: this.budgets.monthly_limit,
          current: monthly_cost,
        });
      }
    }

    // Check per-model budgets
    if (this.budgets.per_model_limits) {
      const model_limit = this.budgets.per_model_limits[snapshot.model];
      if (model_limit) {
        const model_cost = summary.by_model[snapshot.model] || 0;
        if (model_cost >= model_limit * 0.9) {
          this.emitAlert({
            type: "model",
            threshold: model_limit,
            current: model_cost,
            model: snapshot.model,
          });
        }
      }
    }
  }

  /**
   * Emit an alert via callback
   */
  private emitAlert(alert: CostAlert): void {
    // Avoid duplicate alerts for same threshold
    const recent = this.alerts.find(
      (a) =>
        a.type === alert.type &&
        a.threshold === alert.threshold &&
        Date.now() - (a as any)._emitted_at < 3600000 // 1 hour cooldown
    );
    if (recent) return;

    (alert as any)._emitted_at = Date.now();
    this.alerts.push(alert);
    if (this.alerts_callback) {
      this.alerts_callback(alert);
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: CostAlert) => void): void {
    this.alerts_callback = callback;
  }

  /**
   * Get comprehensive cost summary
   */
  getSummary(): CostSummary {
    const nowMs = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const month = today.substring(0, 7);

    // Reset if new day/month
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

      const entry_date = new Date(entry.timestamp).toISOString().split("T")[0];
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
      average_cost_per_request:
        this.history.length > 0
          ? Math.round((total_cost / this.history.length) * 1000000) / 1000000
          : 0,
    };
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): { daily: number | null; monthly: number | null; per_model: Record<string, number> } {
    const summary = this.getSummary();
    const today = new Date().toISOString().split("T")[0];
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

  /**
   * Reset cost history
   */
  reset(): void {
    this.history = [];
    this.alerts = [];
  }

  /**
   * Export cost data for analysis
   */
  export(): CostSnapshot[] {
    return [...this.history];
  }
}