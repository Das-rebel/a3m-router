import { EventEmitter } from 'events';
import { Span, RouteTrace, ObservabilityEvent } from './types';

// Langfuse integration interface
interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}

interface LangfuseClient {
  trace: (data: any) => Promise<void>;
  flush: () => Promise<void>;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

class Tracer extends EventEmitter {
  private traces: Map<string, Span> = new Map();
  private routeTraces: RouteTrace[] = [];
  private langfuseClient?: LangfuseClient;
  private langfuseConfig?: LangfuseConfig;

  constructor() {
    super();
  }

  /**
   * Initialize Langfuse if configured
   */
  initLangfuse(config: LangfuseConfig): void {
    if (!config.publicKey || !config.secretKey) {
      console.warn('[Tracer] Langfuse keys not provided, running without Langfuse');
      return;
    }

    this.langfuseConfig = config;

    // Simple Langfuse REST client
    this.langfuseClient = {
      trace: async (data: any) => {
        try {
          const response = await fetch(`${config.baseUrl || 'https://cloud.langfuse.com'}/api/public/ingestion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.publicKey}`,
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            console.warn('[Tracer] Langfuse ingestion failed:', response.status);
          }
        } catch (err) {
          console.warn('[Tracer] Langfuse error:', err);
        }
      },
      flush: async () => {
        // Langfuse uses async ingestion, noop here
      },
    };

    console.log('[Tracer] Langfuse initialized');
  }

  /**
   * Create a new trace span
   */
  startSpan(operationName: string, parentSpanId?: string): Span {
    const traceId = parentSpanId
      ? this.traces.get(parentSpanId)?.traceId || this.generateTraceId()
      : this.generateTraceId();

    const span: Span = {
      traceId,
      spanId: this.generateTraceId(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      attributes: {},
      status: 'started',
    };

    this.traces.set(span.spanId, span);
    this.emit('span_started', span);
    this.emit('observability_event', { type: 'span_started', span } as ObservabilityEvent);

    return span;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, attributes?: Record<string, any>): void {
    const span = this.traces.get(spanId);
    if (!span) {
      console.warn(`[Tracer] span ${spanId} not found`);
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'completed';

    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }

    this.emit('span_completed', span);
    this.emit('observability_event', { type: 'span_completed', span } as ObservabilityEvent);
  }

  /**
   * Record an error on a span
   */
  errorSpan(spanId: string, error: string, attributes?: Record<string, any>): void {
    const span = this.traces.get(spanId);
    if (!span) {
      console.warn(`[Tracer] span ${spanId} not found`);
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'error';
    span.error = error;

    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }

    this.emit('error', spanId, error);
    this.emit('observability_event', { type: 'error', spanId, error } as ObservabilityEvent);
  }

  /**
   * Record a route decision
   */
  recordRoute(trace: RouteTrace): void {
    this.routeTraces.push(trace);

    // Emit event
    this.emit('route_complete', trace);
    this.emit('observability_event', { type: 'route_complete', trace } as ObservabilityEvent);

    // Export to Langfuse async
    if (this.langfuseClient) {
      this.langfuseClient.trace({
        name: 'route_decision',
        traceId: trace.traceId,
        timestamp: new Date(trace.timestamp).toISOString(),
        input: { query: trace.query },
        output: {
          model: trace.model,
          provider: trace.provider,
          tokens: trace.queryTokens + trace.responseTokens,
          latencyMs: trace.latencyMs,
          cost: trace.cost,
        },
        metadata: {
          queryTokens: trace.queryTokens,
          responseTokens: trace.responseTokens,
          cacheHit: trace.cacheHit,
          complexity: trace.complexity,
          tier: trace.tier,
        },
      }).catch(() => {}); // Fire and forget
    }
  }

  /**
   * Generate a unique trace ID
   */
  generateTraceId(): string {
    return generateId();
  }

  /**
   * Get all route traces
   */
  getTraces(limit?: number): RouteTrace[] {
    if (limit) {
      return this.routeTraces.slice(-limit);
    }
    return [...this.routeTraces];
  }

  /**
   * Get all spans for a trace
   */
  getSpans(traceId: string): Span[] {
    return Array.from(this.traces.values()).filter(s => s.traceId === traceId);
  }

  /**
   * Export to Langfuse (async, non-blocking)
   */
  async flushToLangfuse(): Promise<void> {
    if (this.langfuseClient) {
      await this.langfuseClient.flush();
    }
  }

  /**
   * Clear all traces (for testing)
   */
  reset(): void {
    this.traces.clear();
    this.routeTraces = [];
  }
}

// Singleton instance
let tracerInstance: Tracer | null = null;

export function getTracer(): Tracer {
  if (!tracerInstance) {
    tracerInstance = new Tracer();
  }
  return tracerInstance;
}

export function createTracer(): Tracer {
  tracerInstance = new Tracer();
  return tracerInstance;
}