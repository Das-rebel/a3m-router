import { Metric } from './types';

interface HistogramBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
}

function formatLabels(labels: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(labels)) {
    parts.push(`${key}="${value}"`);
  }
  return parts.join(',');
}

function metricKey(name: string, labels?: Record<string, string>): string {
  if (!labels) return name;
  return `${name}{${formatLabels(labels)}}`;
}

export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Map<string, HistogramBucket>> = new Map();
  private createdAt: number = Date.now();

  /**
   * Increment counter
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  /**
   * Set gauge
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = metricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = metricKey(name, labels);

    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }

    const buckets = this.histograms.get(name)!;
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
  getPrometheusMetrics(): string {
    const lines: string[] = [];
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
  getMetrics(): Metric[] {
    const metrics: Metric[] = [];
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

  private extractLabels(metricKey: string): Record<string, string> {
    const labels: Record<string, string> = {};
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
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.createdAt = Date.now();
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

export function createMetricsCollector(): MetricsCollector {
  metricsInstance = new MetricsCollector();
  return metricsInstance;
}