// Observability tests

import {
  getTracer,
  createTracer,
  getMetrics,
  createMetricsCollector,
  Tracer,
  MetricsCollector,
  RouteTrace,
} from '../src/observability';

// Use a separate tracer instance for tests
function createTestTracer(): Tracer {
  const tracer = new Tracer();
  return tracer;
}

function createTestMetrics(): MetricsCollector {
  return new MetricsCollector();
}

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = createTestTracer();
  });

  afterEach(() => {
    tracer.reset();
  });

  describe('startSpan', () => {
    it('should create a new span', () => {
      const span = tracer.startSpan('test_operation');

      expect(span).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.traceId).toBeDefined();
      expect(span.operationName).toBe('test_operation');
      expect(span.status).toBe('started');
      expect(span.startTime).toBeDefined();
      expect(span.attributes).toEqual({});
    });

    it('should create span with parent', () => {
      const parent = tracer.startSpan('parent_op');
      const child = tracer.startSpan('child_op', parent.spanId);

      expect(child.parentSpanId).toBe(parent.spanId);
      expect(child.traceId).toBe(parent.traceId);
    });

    it('should emit span_started event', (done) => {
      tracer.on('span_started', (span) => {
        expect(span.operationName).toBe('test_op');
        done();
      });
      tracer.startSpan('test_op');
    });
  });

  describe('endSpan', () => {
    it('should end a span with duration', () => {
      const span = tracer.startSpan('test_op');
      tracer.endSpan(span.spanId);

      const ended = tracer.getSpans(span.traceId)[0];
      expect(ended.status).toBe('completed');
      expect(ended.duration).toBeDefined();
      expect(ended.endTime).toBeDefined();
    });

    it('should merge attributes on end', () => {
      const span = tracer.startSpan('test_op');
      tracer.endSpan(span.spanId, { custom_attr: 'value' });

      const ended = tracer.getSpans(span.traceId)[0];
      expect(ended.attributes.custom_attr).toBe('value');
    });

    it('should emit span_completed event', (done) => {
      tracer.on('span_completed', (span) => {
        expect(span.status).toBe('completed');
        done();
      });
      const span = tracer.startSpan('test_op');
      tracer.endSpan(span.spanId);
    });
  });

  describe('errorSpan', () => {
    it('should mark span as error', () => {
      const span = tracer.startSpan('test_op');
      tracer.errorSpan(span.spanId, 'something went wrong');

      const errored = tracer.getSpans(span.traceId)[0];
      expect(errored.status).toBe('error');
      expect(errored.error).toBe('something went wrong');
    });
  });

  describe('recordRoute', () => {
    it('should record a route trace', () => {
      const trace: RouteTrace = {
        traceId: 'trace-123',
        timestamp: Date.now(),
        query: 'Hello world',
        queryTokens: 5,
        model: 'gpt-4o',
        provider: 'openai',
        responseTokens: 100,
        latencyMs: 500,
        cost: 0.03,
        cacheHit: false,
        complexity: 0.5,
        tier: 'premium',
      };

      tracer.recordRoute(trace);

      const traces = tracer.getTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].model).toBe('gpt-4o');
    });

    it('should emit route_complete event', (done) => {
      tracer.on('route_complete', (trace) => {
        expect(trace.model).toBe('test-model');
        done();
      });

      tracer.recordRoute({
        traceId: 'test',
        timestamp: Date.now(),
        query: 'test',
        queryTokens: 1,
        model: 'test-model',
        provider: 'test-provider',
        responseTokens: 1,
        latencyMs: 100,
        cost: 0.01,
        cacheHit: false,
        complexity: 0.1,
        tier: 'standard',
      });
    });
  });

  describe('generateTraceId', () => {
    it('should generate unique IDs', () => {
      const id1 = tracer.generateTraceId();
      const id2 = tracer.generateTraceId();
      expect(id1).not.toBe(id2);
    });
  });
});

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = createTestMetrics();
  });

  afterEach(() => {
    metrics.reset();
  });

  describe('incrementCounter', () => {
    it('should increment a counter', () => {
      metrics.incrementCounter('test_counter');
      metrics.incrementCounter('test_counter');

      const allMetrics = metrics.getMetrics();
      const counter = allMetrics.find(m => m.name.includes('test_counter'));
      expect(counter?.value).toBe(2);
    });

    it('should handle labels', () => {
      metrics.incrementCounter('requests_total', { model: 'gpt-4', provider: 'openai' });
      metrics.incrementCounter('requests_total', { model: 'gpt-4', provider: 'openai' });
      metrics.incrementCounter('requests_total', { model: 'claude-3', provider: 'anthropic' });

      const allMetrics = metrics.getMetrics();
      const gpt4Metrics = allMetrics.filter(m =>
        m.labels.model === 'gpt-4' && m.labels.provider === 'openai'
      );
      const claudeMetrics = allMetrics.filter(m => m.labels.model === 'claude-3');

      expect(gpt4Metrics[0]?.value).toBe(2);
      expect(claudeMetrics[0]?.value).toBe(1);
    });
  });

  describe('setGauge', () => {
    it('should set a gauge value', () => {
      metrics.setGauge('active_providers', 5);
      metrics.setGauge('active_providers', 6);

      const allMetrics = metrics.getMetrics();
      const gauge = allMetrics.find(m => m.name.includes('active_providers'));
      expect(gauge?.value).toBe(6);
    });
  });

  describe('recordHistogram', () => {
    it('should record histogram values', () => {
      metrics.recordHistogram('latency', 0.5);
      metrics.recordHistogram('latency', 1.0);
      metrics.recordHistogram('latency', 1.5);

      const allMetrics = metrics.getMetrics();
      const histogram = allMetrics.find(m => m.type === 'histogram');
      expect(histogram).toBeDefined();
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should output Prometheus format', () => {
      metrics.setGauge('a3m_active_providers', 5, { provider: 'openai' });
      metrics.incrementCounter('a3m_router_requests_total', { model: 'gpt-4', provider: 'openai' });
      metrics.recordHistogram('a3m_request_latency_seconds', 0.5);

      const output = metrics.getPrometheusMetrics();

      expect(output).toContain('# HELP');
      expect(output).toContain('# TYPE');
      expect(output).toContain('a3m_active_providers');
      expect(output).toContain('a3m_router_requests_total');
      expect(output).toContain('a3m_request_latency_seconds');
    });

    it('should include router info', () => {
      const output = metrics.getPrometheusMetrics();
      expect(output).toContain('a3m_router_info');
    });

    it('should include timestamp', () => {
      const output = metrics.getPrometheusMetrics();
      // Should end with a timestamp number
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const parts = lastLine.split(' ');
      const lastValue = parts[parts.length - 1];
      expect(Number(lastValue)).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics as objects', () => {
      metrics.incrementCounter('counter_test', { label: 'value' });
      metrics.setGauge('gauge_test', 42);
      metrics.recordHistogram('histogram_test', 1.0);

      const allMetrics = metrics.getMetrics();

      expect(allMetrics.length).toBeGreaterThan(0);
      expect(allMetrics.some(m => m.type === 'counter')).toBe(true);
      expect(allMetrics.some(m => m.type === 'gauge')).toBe(true);
      expect(allMetrics.some(m => m.type === 'histogram')).toBe(true);
    });

    it('should include timestamp', () => {
      metrics.incrementCounter('test_metric');
      const allMetrics = metrics.getMetrics();

      expect(allMetrics[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.incrementCounter('test_counter');
      metrics.setGauge('test_gauge', 10);
      metrics.recordHistogram('test_histogram', 1.0);

      metrics.reset();

      const allMetrics = metrics.getMetrics();
      expect(allMetrics).toHaveLength(0);
    });
  });
});

describe('Integration', () => {
  it('should track route metrics end-to-end', () => {
    const tracer = createTestTracer();
    const metrics = createTestMetrics();

    const trace: RouteTrace = {
      traceId: 'e2e-trace',
      timestamp: Date.now(),
      query: 'Hello AI',
      queryTokens: 3,
      model: 'gpt-4o',
      provider: 'openai',
      responseTokens: 50,
      latencyMs: 250,
      cost: 0.015,
      cacheHit: false,
      complexity: 0.3,
      tier: 'premium',
    };

    // Record the route
    tracer.recordRoute(trace);

    // Record metrics for this route
    metrics.incrementCounter('a3m_router_requests_total', {
      model: trace.model,
      provider: trace.provider,
      tier: trace.tier,
      cache_hit: String(trace.cacheHit),
    });
    metrics.recordHistogram('a3m_request_latency_seconds', trace.latencyMs / 1000, {
      model: trace.model,
      provider: trace.provider,
    });
    metrics.recordHistogram('a3m_request_cost_cents', trace.cost * 100, {
      model: trace.model,
      provider: trace.provider,
    });

    // Verify trace recorded
    const traces = tracer.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0].cost).toBe(0.015);

    // Verify metrics recorded
    const allMetrics = metrics.getMetrics();
    const requestCounter = allMetrics.find(
      m => m.name.includes('a3m_router_requests_total')
    );
    expect(requestCounter?.value).toBe(1);

    const latencyHist = allMetrics.find(
      m => m.name.includes('a3m_request_latency_seconds')
    );
    expect(latencyHist).toBeDefined();
  });

  it('should track cache hit/miss', () => {
    const tracer = createTestTracer();
    const metrics = createTestMetrics();

    // Cache hit
    tracer.recordRoute({
      traceId: 'cache-hit',
      timestamp: Date.now(),
      query: 'cached query',
      queryTokens: 10,
      model: 'gpt-4o-mini',
      provider: 'openai',
      responseTokens: 20,
      latencyMs: 50,
      cost: 0,
      cacheHit: true,
      complexity: 0.2,
      tier: 'budget',
    });

    // Cache miss
    tracer.recordRoute({
      traceId: 'cache-miss',
      timestamp: Date.now(),
      query: 'new query',
      queryTokens: 10,
      model: 'gpt-4o',
      provider: 'openai',
      responseTokens: 100,
      latencyMs: 500,
      cost: 0.02,
      cacheHit: false,
      complexity: 0.5,
      tier: 'premium',
    });

    metrics.incrementCounter('a3m_cache_hits_total');
    metrics.incrementCounter('a3m_cache_misses_total');

    const allMetrics = metrics.getMetrics();
    const hits = allMetrics.find(m => m.name === 'a3m_cache_hits_total');
    const misses = allMetrics.find(m => m.name === 'a3m_cache_misses_total');

    expect(hits?.value).toBe(1);
    expect(misses?.value).toBe(1);
  });
});