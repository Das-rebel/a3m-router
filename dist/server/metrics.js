"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCounter = incrementCounter;
exports.recordHistogram = recordHistogram;
exports.setGauge = setGauge;
exports.recordActiveRequest = recordActiveRequest;
exports.getActiveRequests = getActiveRequests;
exports.generatePrometheusMetrics = generatePrometheusMetrics;
exports.recordRequest = recordRequest;
exports.recordProviderError = recordProviderError;
exports.recordCacheHit = recordCacheHit;
exports.recordFallback = recordFallback;
// ============================================================
// METRICS STORE
// ============================================================
// Counters: { name: { labels: value } }
const counters = new Map();
// Histograms: { name: { labels: { values[], count, sum, buckets[] } } }
const histograms = new Map();
// Gauges: { name: { labels: value } }
const gauges = new Map();
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
};
const LABEL_NAMES = {
    a3m_requests_total: ['endpoint', 'provider', 'status'],
    a3m_request_duration_ms: ['endpoint', 'provider'],
    a3m_cost_usd_total: ['provider'],
    a3m_tokens_total: ['provider', 'type'],
    a3m_cache_hits_total: ['cache_type'],
    a3m_fallback_triggered_total: ['provider'],
    a3m_provider_errors_total: ['provider', 'error_type'],
    a3m_routing_decisions_total: ['model'],
    a3m_active_requests: [],
};
// ============================================================
// HELPERS
// ============================================================
function labelsToKey(labels) {
    return Object.keys(labels)
        .sort()
        .map((k) => `${k}="${labels[k]}"`)
        .join(',');
}
function getOrInitCounter(name, labels) {
    if (!counters.has(name))
        counters.set(name, new Map());
    const counterMap = counters.get(name);
    const key = labelsToKey(labels);
    if (!counterMap.has(key))
        counterMap.set(key, 0);
    return counterMap;
}
function getOrInitHistogram(name, labels) {
    if (!histograms.has(name))
        histograms.set(name, new Map());
    const histMap = histograms.get(name);
    const key = labelsToKey(labels);
    if (!histMap.has(key)) {
        const def = METRIC_DEFINITIONS[name];
        if (def.type !== 'histogram') {
            throw new Error(`Metric ${name} is not a histogram`);
        }
        const histDef = def;
        histMap.set(key, {
            values: [],
            count: 0,
            sum: 0,
            buckets: histDef.buckets.map((b) => ({ bound: b, count: 0 })),
        });
    }
    return histMap.get(key);
}
function getOrInitGauge(name, labels) {
    if (!gauges.has(name))
        gauges.set(name, new Map());
    const gaugeMap = gauges.get(name);
    const key = labelsToKey(labels);
    if (!gaugeMap.has(key))
        gaugeMap.set(key, 0);
    return gaugeMap;
}
// ============================================================
// PUBLIC API
// ============================================================
/**
 * Increment a counter by delta (default 1).
 */
function incrementCounter(name, labels = {}, delta = 1) {
    const counterMap = getOrInitCounter(name, labels);
    const key = labelsToKey(labels);
    counterMap.set(key, counterMap.get(key) + delta);
}
/**
 * Record a histogram value (duration, size, etc.).
 */
function recordHistogram(name, labels, value) {
    const hist = getOrInitHistogram(name, labels);
    hist.values.push(value);
    hist.count++;
    hist.sum += value;
    // Update bucket counts
    for (const bucket of hist.buckets) {
        if (value <= bucket.bound)
            bucket.count++;
    }
}
/**
 * Set a gauge value.
 */
function setGauge(name, labels, value) {
    const gaugeMap = getOrInitGauge(name, labels);
    const key = labelsToKey(labels);
    gaugeMap.set(key, value);
}
/**
 * Increment active requests gauge (call on start, decrement on end).
 */
function recordActiveRequest(delta) {
    setGauge('a3m_active_requests', {}, Math.max(0, getActiveRequests() + delta));
}
/**
 * Get current active request count.
 */
function getActiveRequests() {
    const gaugeMap = gauges.get('a3m_active_requests');
    if (!gaugeMap || gaugeMap.size === 0)
        return 0;
    return Array.from(gaugeMap.values())[0] || 0;
}
// ============================================================
// PROMETHEUS EXPORT FORMAT
// ============================================================
/**
 * Generate Prometheus /metrics output.
 */
function generatePrometheusMetrics() {
    const lines = [];
    // Helper to get metric help/type
    function metricHeader(name) {
        const def = METRIC_DEFINITIONS[name];
        if (!def)
            return '';
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
function recordRequest(params) {
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
function recordProviderError(provider, errorType) {
    incrementCounter('a3m_provider_errors_total', { provider, error_type: errorType });
}
/**
 * Record a cache hit.
 */
function recordCacheHit(cacheType) {
    incrementCounter('a3m_cache_hits_total', { cache_type: cacheType });
}
/**
 * Record a fallback trigger.
 */
function recordFallback(provider) {
    incrementCounter('a3m_fallback_triggered_total', { provider });
}
exports.default = {
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
//# sourceMappingURL=metrics.js.map