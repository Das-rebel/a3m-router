/**
 * A3M Router - Cost Analytics
 *
 * Advanced cost tracking and analytics:
 * - Record every request with full metadata
 * - Real-time savings vs single premium provider
 * - Monthly/yearly projections
 * - Breakdown by provider and query type
 * - Export to JSON or CSV
 * - In-memory storage with auto-rotation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CostRecord {
  timestamp: Date;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  queryType: 'simple' | 'code' | 'summary' | 'complex';
  cached: boolean;
}

export interface CostSummary {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatency: number;
  cacheHitRate: number;
  period: { start: Date; end: Date };
}

export interface ProviderStats {
  totalCost: number;
  totalRequests: number;
  avgLatency: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  models: Record<string, { cost: number; requests: number }>;
}

export interface QueryTypeStats {
  totalCost: number;
  totalRequests: number;
  avgLatency: number;
  cachedCount: number;
  cacheHitRate: number;
}

export interface SavingsReport {
  totalSaved: number;
  percentageSaved: number;
  byQueryType: Record<string, { saved: number; percentage: number }>;
  projectedMonthlySavings: number;
  projectedYearlySavings: number;
}

// Model costs per 1M tokens (USD) for baseline comparison
const BASELINE_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'groq/llama-3.3-70b': { input: 0.59, output: 0.79 },
  'groq/llama-3.1-8b': { input: 0.05, output: 0.08 },
  'cerebras/llama-3.3-70b': { input: 0.10, output: 0.10 },
  'mistral-large': { input: 2.00, output: 6.00 },
  'mistral-small': { input: 0.20, output: 0.60 },
};

// ---------------------------------------------------------------------------
// CostAnalytics
// ---------------------------------------------------------------------------

export class CostAnalytics {
  private records: CostRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.maxRecords = maxRecords;
  }

  // ---- Record ----

  record(data: Omit<CostRecord, 'timestamp'>): void {
    const entry: CostRecord = { ...data, timestamp: new Date() };
    this.records.push(entry);

    // Auto-rotate
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  // ---- Summary ----

  getSummary(period: 'hour' | 'day' | 'week' | 'month' = 'day'): CostSummary {
    const filtered = this.filterByPeriod(period);
    if (filtered.length === 0) {
      const now = new Date();
      return {
        totalCost: 0, totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0,
        avgLatency: 0, cacheHitRate: 0,
        period: { start: now, end: now },
      };
    }

    const totalCost = sum(filtered, (r) => r.cost);
    const cached = filtered.filter((r) => r.cached).length;
    const start = filtered[0].timestamp;
    const end = filtered[filtered.length - 1].timestamp;

    return {
      totalCost: round(totalCost),
      totalRequests: filtered.length,
      totalInputTokens: sum(filtered, (r) => r.inputTokens),
      totalOutputTokens: sum(filtered, (r) => r.outputTokens),
      avgLatency: round(sum(filtered, (r) => r.latency) / filtered.length),
      cacheHitRate: round(cached / filtered.length),
      period: { start, end },
    };
  }

  // ---- By provider ----

  getByProvider(): Record<string, ProviderStats> {
    const result: Record<string, ProviderStats> = {};
    for (const r of this.records) {
      if (!result[r.provider]) {
        result[r.provider] = {
          totalCost: 0, totalRequests: 0, avgLatency: 0,
          totalInputTokens: 0, totalOutputTokens: 0, models: {},
        };
      }
      const p = result[r.provider];
      p.totalCost += r.cost;
      p.totalRequests++;
      p.avgLatency += r.latency;
      p.totalInputTokens += r.inputTokens;
      p.totalOutputTokens += r.outputTokens;

      if (!p.models[r.model]) {
        p.models[r.model] = { cost: 0, requests: 0 };
      }
      p.models[r.model].cost += r.cost;
      p.models[r.model].requests++;
    }

    for (const p of Object.values(result)) {
      if (p.totalRequests > 0) {
        p.avgLatency = round(p.avgLatency / p.totalRequests);
      }
      p.totalCost = round(p.totalCost);
    }
    return result;
  }

  // ---- By query type ----

  getByQueryType(): Record<string, QueryTypeStats> {
    const result: Record<string, QueryTypeStats> = {};
    for (const r of this.records) {
      if (!result[r.queryType]) {
        result[r.queryType] = {
          totalCost: 0, totalRequests: 0, avgLatency: 0, cachedCount: 0, cacheHitRate: 0,
        };
      }
      const q = result[r.queryType];
      q.totalCost += r.cost;
      q.totalRequests++;
      q.avgLatency += r.latency;
      if (r.cached) q.cachedCount++;
    }

    for (const q of Object.values(result)) {
      if (q.totalRequests > 0) {
        q.avgLatency = round(q.avgLatency / q.totalRequests);
        q.cacheHitRate = round(q.cachedCount / q.totalRequests);
      }
      q.totalCost = round(q.totalCost);
    }
    return result;
  }

  // ---- Savings ----

  getSavings(baselineProvider: string = 'gpt-4o'): SavingsReport {
    const baseline = BASELINE_COSTS[baselineProvider] || { input: 2.50, output: 10.00 };
    let totalActual = 0;
    let totalBaseline = 0;
    const byQueryType: Record<string, { actual: number; baseline: number }> = {};

    for (const r of this.records) {
      const actualCost = r.cost;
      const baselineCost =
        (r.inputTokens / 1_000_000) * baseline.input +
        (r.outputTokens / 1_000_000) * baseline.output;

      totalActual += actualCost;
      totalBaseline += baselineCost;

      if (!byQueryType[r.queryType]) {
        byQueryType[r.queryType] = { actual: 0, baseline: 0 };
      }
      byQueryType[r.queryType].actual += actualCost;
      byQueryType[r.queryType].baseline += baselineCost;
    }

    const totalSaved = totalBaseline - totalActual;
    const percentageSaved = totalBaseline > 0 ? (totalSaved / totalBaseline) * 100 : 0;

    // Project based on days of data we have
    const daysCovered = this.getDaysCovered();
    const dailySavings = daysCovered > 0 ? totalSaved / daysCovered : 0;

    const queryTypeSavings: Record<string, { saved: number; percentage: number }> = {};
    for (const [qt, data] of Object.entries(byQueryType)) {
      const saved = data.baseline - data.actual;
      queryTypeSavings[qt] = {
        saved: round(saved),
        percentage: data.baseline > 0 ? round((saved / data.baseline) * 100) : 0,
      };
    }

    return {
      totalSaved: round(totalSaved),
      percentageSaved: round(percentageSaved),
      byQueryType: queryTypeSavings,
      projectedMonthlySavings: round(dailySavings * 30),
      projectedYearlySavings: round(dailySavings * 365),
    };
  }

  // ---- Export ----

  export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const header = 'timestamp,provider,model,inputTokens,outputTokens,cost,latency,queryType,cached';
      const rows = this.records.map((r) =>
        `${r.timestamp.toISOString()},${r.provider},${r.model},${r.inputTokens},${r.outputTokens},${r.cost},${r.latency},${r.queryType},${r.cached}`
      );
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(this.records, null, 2);
  }

  // ---- Reset ----

  reset(): void {
    this.records = [];
  }

  // ---- Internals ----

  private filterByPeriod(period: 'hour' | 'day' | 'week' | 'month'): CostRecord[] {
    const now = Date.now();
    const ms: Record<string, number> = {
      hour: 3600_000,
      day: 86400_000,
      week: 604800_000,
      month: 2592000_000,
    };
    const cutoff = now - (ms[period] || ms.day);
    return this.records.filter((r) => r.timestamp.getTime() >= cutoff);
  }

  private getDaysCovered(): number {
    if (this.records.length < 2) return 1;
    const first = this.records[0].timestamp.getTime();
    const last = this.records[this.records.length - 1].timestamp.getTime();
    return Math.max(1, (last - first) / 86400_000);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sum(arr: CostRecord[], fn: (r: CostRecord) => number): number {
  return arr.reduce((acc, r) => acc + fn(r), 0);
}

function round(n: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

export function createCostAnalytics(maxRecords?: number): CostAnalytics {
  return new CostAnalytics(maxRecords);
}
