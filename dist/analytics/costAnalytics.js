"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostAnalytics = void 0;
exports.createCostAnalytics = createCostAnalytics;
// Model costs per 1M tokens (USD) for baseline comparison
const BASELINE_COSTS = {
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
class CostAnalytics {
    records = [];
    maxRecords;
    constructor(maxRecords = 10000) {
        this.maxRecords = maxRecords;
    }
    // ---- Record ----
    record(data) {
        const entry = { ...data, timestamp: new Date() };
        this.records.push(entry);
        // Auto-rotate
        if (this.records.length > this.maxRecords) {
            this.records = this.records.slice(-this.maxRecords);
        }
    }
    // ---- Summary ----
    getSummary(period = 'day') {
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
    getByProvider() {
        const result = {};
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
    getByQueryType() {
        const result = {};
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
            if (r.cached)
                q.cachedCount++;
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
    getSavings(baselineProvider = 'gpt-4o') {
        const baseline = BASELINE_COSTS[baselineProvider] || { input: 2.50, output: 10.00 };
        let totalActual = 0;
        let totalBaseline = 0;
        const byQueryType = {};
        for (const r of this.records) {
            const actualCost = r.cost;
            const baselineCost = (r.inputTokens / 1_000_000) * baseline.input +
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
        const queryTypeSavings = {};
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
    export(format = 'json') {
        if (format === 'csv') {
            const header = 'timestamp,provider,model,inputTokens,outputTokens,cost,latency,queryType,cached';
            const rows = this.records.map((r) => `${r.timestamp.toISOString()},${r.provider},${r.model},${r.inputTokens},${r.outputTokens},${r.cost},${r.latency},${r.queryType},${r.cached}`);
            return [header, ...rows].join('\n');
        }
        return JSON.stringify(this.records, null, 2);
    }
    // ---- Reset ----
    reset() {
        this.records = [];
    }
    // ---- Internals ----
    filterByPeriod(period) {
        const now = Date.now();
        const ms = {
            hour: 3600_000,
            day: 86400_000,
            week: 604800_000,
            month: 2592000_000,
        };
        const cutoff = now - (ms[period] || ms.day);
        return this.records.filter((r) => r.timestamp.getTime() >= cutoff);
    }
    getDaysCovered() {
        if (this.records.length < 2)
            return 1;
        const first = this.records[0].timestamp.getTime();
        const last = this.records[this.records.length - 1].timestamp.getTime();
        return Math.max(1, (last - first) / 86400_000);
    }
}
exports.CostAnalytics = CostAnalytics;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sum(arr, fn) {
    return arr.reduce((acc, r) => acc + fn(r), 0);
}
function round(n, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
}
// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------
function createCostAnalytics(maxRecords) {
    return new CostAnalytics(maxRecords);
}
//# sourceMappingURL=costAnalytics.js.map