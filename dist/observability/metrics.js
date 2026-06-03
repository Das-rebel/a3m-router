"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
exports.getMetrics = getMetrics;
exports.createMetricsCollector = createMetricsCollector;
function formatLabels(labels) {
    const parts = [];
    for (const [key, value] of Object.entries(labels)) {
        parts.push(`${key}="${value}"`);
    }
    return parts.join(',');
}
function metricKey(name, labels) {
    if (!labels)
        return name;
    return `${name}{${formatLabels(labels)}}`;
}
class MetricsCollector {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    createdAt = Date.now();
    /**
     * Increment counter
     */
    incrementCounter(name, labels, value = 1) {
        const key = metricKey(name, labels);
        this.counters.set(key, (this.counters.get(key) || 0) + value);
    }
    /**
     * Set gauge
     */
    setGauge(name, value, labels) {
        const key = metricKey(name, labels);
        this.gauges.set(key, value);
    }
    /**
     * Record histogram value
     */
    recordHistogram(name, value, labels) {
        const key = metricKey(name, labels);
        if (!this.histograms.has(name)) {
            this.histograms.set(name, new Map());
        }
        const buckets = this.histograms.get(name);
        const bucket = buckets.get(key) || { count: 0, sum: 0, min: Infinity, max: -Infinity };
        bucket.count++;
        bucket.sum += value;
        bucket.min = Math.min(bucket.min, value);
        bucket.max = Math.max(bucket.max, value);
        buckets.set(key, bucket);
    }
    /**
     * Get metrics in Prometheus format
     */
    getPrometheusMetrics() {
        const lines = [];
        const timestamp = Date.now();
        lines.push('# HELP a3m_router_info A3M Router info');
        lines.push('# TYPE a3m_router_info gauge');
        lines.push('a3m_router_info{router_version="2.0.0"} 1');
        // Counters
        lines.push('');
        lines.push('# HELP a3m_router_requests_total Total number of router requests');
        lines.push('# TYPE a3m_router_requests_total counter');
        for (const [key, value] of this.counters) {
            if (key.startsWith('a3m_router_') || key.startsWith('a3m_')) {
                lines.push(`${key} ${value} ${timestamp}`);
            }
        }
        // Cache counters
        for (const [key, value] of this.counters) {
            if (key.startsWith('cache_')) {
                lines.push(`${key} ${value} ${timestamp}`);
            }
        }
        // Gauges
        lines.push('');
        lines.push('# HELP a3m_active_providers Number of active providers');
        lines.push('# TYPE a3m_active_providers gauge');
        for (const [key, value] of this.gauges) {
            lines.push(`${key} ${value} ${timestamp}`);
        }
        // Histograms
        lines.push('');
        lines.push('# HELP a3m_request_latency_seconds Request latency in seconds');
        lines.push('# TYPE a3m_request_latency_seconds histogram');
        for (const [name, buckets] of this.histograms) {
            if (name.includes('latency')) {
                for (const [bucketKey, bucket] of buckets) {
                    const labelStr = bucketKey.includes('{') ? bucketKey.slice(name.length) : '';
                    lines.push(`${name}_sum${labelStr} ${bucket.sum} ${timestamp}`);
                    lines.push(`${name}_count${labelStr} ${bucket.count} ${timestamp}`);
                }
            }
        }
        lines.push('');
        lines.push('# HELP a3m_request_cost_cents Request cost in cents');
        lines.push('# TYPE a3m_request_cost_cents histogram');
        for (const [name, buckets] of this.histograms) {
            if (name.includes('cost')) {
                for (const [bucketKey, bucket] of buckets) {
                    const labelStr = bucketKey.includes('{') ? bucketKey.slice(name.length) : '';
                    lines.push(`${name}_sum${labelStr} ${bucket.sum} ${timestamp}`);
                    lines.push(`${name}_count${labelStr} ${bucket.count} ${timestamp}`);
                }
            }
        }
        return lines.join('\n');
    }
    /**
     * Get all metrics as Metric objects
     */
    getMetrics() {
        const metrics = [];
        const timestamp = Date.now();
        for (const [key, value] of this.counters) {
            metrics.push({
                name: key,
                value,
                timestamp,
                labels: this.extractLabels(key),
                type: 'counter',
            });
        }
        for (const [key, value] of this.gauges) {
            metrics.push({
                name: key,
                value,
                timestamp,
                labels: this.extractLabels(key),
                type: 'gauge',
            });
        }
        for (const [name, buckets] of this.histograms) {
            for (const [bucketKey, bucket] of buckets) {
                metrics.push({
                    name: bucketKey,
                    value: bucket.count,
                    timestamp,
                    labels: this.extractLabels(bucketKey),
                    type: 'histogram',
                });
            }
        }
        return metrics;
    }
    extractLabels(metricKey) {
        const labels = {};
        const match = metricKey.match(/\{(.+)\}/);
        if (match) {
            const pairs = match[1].split(',');
            for (const pair of pairs) {
                const [key, value] = pair.split('=');
                labels[key] = value.replace(/"/g, '');
            }
        }
        return labels;
    }
    /**
     * Clear metrics
     */
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.createdAt = Date.now();
    }
}
exports.MetricsCollector = MetricsCollector;
// Singleton instance
let metricsInstance = null;
function getMetrics() {
    if (!metricsInstance) {
        metricsInstance = new MetricsCollector();
    }
    return metricsInstance;
}
function createMetricsCollector() {
    metricsInstance = new MetricsCollector();
    return metricsInstance;
}
//# sourceMappingURL=metrics.js.map