/**
 * A3M Router - Prometheus Metrics
 *
 * Lightweight metrics collector for observability.
 * Exports Prometheus-compatible /metrics endpoint.
 *
 * Metrics:
 *   a3m_requests_total{endpoint, provider, status}    — Counter
 *   a3m_request_duration_ms{endpoint, provider}       — Histogram
 *   a3m_cost_usd_total{provider}                     — Counter
 *   a3m_tokens_total{provider, type}                  — Counter
 *   a3m_cache_hits_total{cache_type}                 — Counter
 *   a3m_fallback_triggered_total{provider}           — Counter
 *   a3m_provider_errors_total{provider, error_type}  — Counter
 *   a3m_routing_decisions_total{model}               — Counter
 *   a3m_active_requests                             — Gauge
 */

// ============================================================
// TYPES
// ============================================================

export interface Counter {
  value: number;
  labels: Record<string, string>;
}

export interface Histogram {
  values: number[];
  count: number;
  sum: number;
  buckets: { bound: number; count: number }[];
}

export interface Gauge {
  value: number;
}

// ============================================================
// METRICS STORE
// ============================================================

// Counters: { name: { labels: value } }
const counters = new Map<string, Map<string, number>>();
// Histograms: { name: { labels: { values[], count, sum, buckets[] } } }
const histograms = new Map<string, Map<string, Histogram>>();
// Gauges: { name: { labels: value } }
const gauges = new Map<string, Map<string, number>>();

// Metric definitions
const METRIC_DEFINITIONS = {
  a3m_requests_total: { type: 'counter', help: 'Total requests' },
  a3m_request_duration_ms: {
    type: 'histogram',
    help: 'Request duration in milliseconds',
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  },
  a3m_cost_usd_total: { type: 'counter', help: 'Total cost in USD' },
  a3m_tokens_total: { type: 'counter', help: 'Total tokens' },
  a3m_cache_hits_total: { type: 'counter', help: 'Cache hits' },
  a3m_fallback_triggered_total: { type: 'counter', help: 'Fallback triggered count' },
  a3m_provider_errors_total: { type: 'counter', help: 'Provider errors' },
  a3m_routing_decisions_total: { type: 'counter', help: 'Routing decisions' },
  a3m_active_requests: { type: 'gauge', help: 'Active requests' },
} as const;

const LABEL_NAMES = {
  a3m_requests_total: ['endpoint', 'provider', 'status'] as const,
  a3m_request_duration_ms: ['endpoint', 'provider'] as const,
  a3m_cost_usd_total: ['provider'] as const,
  a3m_tokens_total: ['provider', 'type'] as const,
  a3m_cache_hits_total: ['cache_type'] as const,
  a3m_fallback_triggered_total: ['provider'] as const,
  a3m_provider_errors_total: ['provider', 'error_type'] as const,
  a3m_routing_decisions_total: ['model'] as const,
  a3m_active_requests: [] as const,
} as const;

// ============================================================
// HELPERS
// ============================================================

function labelsToKey(labels: Record<string, string>): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`)
    .join(',');
}

function getOrInitCounter(name: string, labels: Record<string, string>): Map<string, number> {
  if (!counters.has(name)) counters.set(name, new Map());
  const counterMap = counters.get(name)!;
  const key = labelsToKey(labels);
  if (!counterMap.has(key)) counterMap.set(key, 0);
  return counterMap;
}

function getOrInitHistogram(name: string, labels: Record<string, string>): Histogram {
  if (!histograms.has(name)) histograms.set(name, new Map());
  const histMap = histograms.get(name)!;
  const key = labelsToKey(labels);
  if (!histMap.has(key)) {
    const def = METRIC_DEFINITIONS[name as keyof typeof METRIC_DEFINITIONS];
    if (def.type !== 'histogram') {
      throw new Error(`Metric ${name} is not a histogram`);
    }
    const histDef = def as { type: 'histogram'; buckets: readonly number[] };
    histMap.set(key, {
      values: [],
      count: 0,
      sum: 0,
      buckets: histDef.buckets.map((b) => ({ bound: b, count: 0 })),
    });
  }
  return histMap.get(key)!;
}

function getOrInitGauge(name: string, labels: Record<string, string>): Map<string, number> {
  if (!gauges.has(name)) gauges.set(name, new Map());
  const gaugeMap = gauges.get(name)!;
  const key = labelsToKey(labels);
  if (!gaugeMap.has(key)) gaugeMap.set(key, 0);
  return gaugeMap;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Increment a counter by delta (default 1).
 */
export function incrementCounter(name: string, labels: Record<string, string> = {}, delta = 1): void {
  const counterMap = getOrInitCounter(name, labels);
  const key = labelsToKey(labels);
  counterMap.set(key, counterMap.get(key)! + delta);
}

/**
 * Record a histogram value (duration, size, etc.).
 */
export function recordHistogram(name: string, labels: Record<string, string>, value: number): void {
  const hist = getOrInitHistogram(name, labels);
  hist.values.push(value);
  hist.count++;
  hist.sum += value;
  // Update bucket counts
  for (const bucket of hist.buckets) {
    if (value <= bucket.bound) bucket.count++;
  }
}

/**
 * Set a gauge value.
 */
export function setGauge(name: string, labels: Record<string, string>, value: number): void {
  const gaugeMap = getOrInitGauge(name, labels);
  const key = labelsToKey(labels);
  gaugeMap.set(key, value);
}

/**
 * Increment active requests gauge (call on start, decrement on end).
 */
export function recordActiveRequest(delta: 1 | -1): void {
  setGauge('a3m_active_requests', {}, Math.max(0, getActiveRequests() + delta));
}

/**
 * Get current active request count.
 */
export function getActiveRequests(): number {
  const gaugeMap = gauges.get('a3m_active_requests');
  if (!gaugeMap || gaugeMap.size === 0) return 0;
  return Array.from(gaugeMap.values())[0] || 0;
}

// ============================================================
// PROMETHEUS EXPORT FORMAT
// ============================================================

/**
 * Generate Prometheus /metrics output.
 */
export function generatePrometheusMetrics(): string {
  const lines: string[] = [];

  // Helper to get metric help/type
  function metricHeader(name: string): string {
    const def = METRIC_DEFINITIONS[name as keyof typeof METRIC_DEFINITIONS];
    if (!def) return '';
    return `# HELP ${name} ${def.help}\n# TYPE ${name} ${def.type}`;
  }

  // Counters
  for (const [name, counterMap] of counters) {
    lines.push(metricHeader(name));
    for (const [labelKey, value] of counterMap) {
      lines.push(`${name}{${labelKey}} ${value}`);
    }
    lines.push('');
  }

  // Histograms
  for (const [name, histMap] of histograms) {
    lines.push(metricHeader(name));
    for (const [labelKey, hist] of histMap) {
      // Per-bucket cumulative counts
      for (const bucket of hist.buckets) {
        lines.push(`${name}_bucket{${labelKey},le="${bucket.bound}"} ${bucket.count}`);
      }
      // +Inf bucket = total count
      lines.push(`${name}_bucket{${labelKey},le="+Inf"} ${hist.count}`);
      // Summary
      lines.push(`${name}_sum{${labelKey}} ${hist.sum}`);
      lines.push(`${name}_count{${labelKey}} ${hist.count}`);
    }
    lines.push('');
  }

  // Gauges
  for (const [name, gaugeMap] of gauges) {
    lines.push(metricHeader(name));
    for (const [labelKey, value] of gaugeMap) {
      lines.push(`${name}{${labelKey}} ${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// SPECIALIZED RECORDERS (convenience wrappers)
// ============================================================

/**
 * Record a completed request with all metrics.
 */
export function recordRequest(params: {
  endpoint: string;
  provider: string;
  status: 'success' | 'error';
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  model?: string;
}): void {
  incrementCounter('a3m_requests_total', {
    endpoint: params.endpoint,
    provider: params.provider,
    status: params.status,
  });
  recordHistogram('a3m_request_duration_ms', {
    endpoint: params.endpoint,
    provider: params.provider,
  }, params.durationMs);
  if (params.tokensIn !== undefined && params.tokensOut !== undefined) {
    incrementCounter('a3m_tokens_total', { provider: params.provider, type: 'input' }, params.tokensIn);
    incrementCounter('a3m_tokens_total', { provider: params.provider, type: 'output' }, params.tokensOut);
  }
  if (params.cost !== undefined && params.cost > 0) {
    incrementCounter('a3m_cost_usd_total', { provider: params.provider }, Math.round(params.cost * 1e6) / 1e6);
  }
  if (params.model) {
    incrementCounter('a3m_routing_decisions_total', { model: params.model });
  }
}

/**
 * Record a provider error.
 */
export function recordProviderError(provider: string, errorType: string): void {
  incrementCounter('a3m_provider_errors_total', { provider, error_type: errorType });
}

/**
 * Record a cache hit.
 */
export function recordCacheHit(cacheType: 'semantic' | 'exact' | 'none'): void {
  incrementCounter('a3m_cache_hits_total', { cache_type: cacheType });
}

/**
 * Record a fallback trigger.
 */
export function recordFallback(provider: string): void {
  incrementCounter('a3m_fallback_triggered_total', { provider });
}

export default {
  incrementCounter,
  recordHistogram,
  setGauge,
  recordActiveRequest,
  getActiveRequests,
  generatePrometheusMetrics,
  recordRequest,
  recordProviderError,
  recordCacheHit,
  recordFallback,
};
