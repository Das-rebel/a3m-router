"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracer = void 0;
exports.getTracer = getTracer;
exports.createTracer = createTracer;
const events_1 = require("events");
function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
class Tracer extends events_1.EventEmitter {
    traces = new Map();
    routeTraces = [];
    langfuseClient;
    langfuseConfig;
    constructor() {
        super();
    }
    /**
     * Initialize Langfuse if configured
     */
    initLangfuse(config) {
        if (!config.publicKey || !config.secretKey) {
            console.warn('[Tracer] Langfuse keys not provided, running without Langfuse');
            return;
        }
        this.langfuseConfig = config;
        // Simple Langfuse REST client
        this.langfuseClient = {
            trace: async (data) => {
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
                }
                catch (err) {
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
    startSpan(operationName, parentSpanId) {
        const traceId = parentSpanId
            ? this.traces.get(parentSpanId)?.traceId || this.generateTraceId()
            : this.generateTraceId();
        const span = {
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
        this.emit('observability_event', { type: 'span_started', span });
        return span;
    }
    /**
     * End a span
     */
    endSpan(spanId, attributes) {
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
        this.emit('observability_event', { type: 'span_completed', span });
    }
    /**
     * Record an error on a span
     */
    errorSpan(spanId, error, attributes) {
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
        this.emit('observability_event', { type: 'error', spanId, error });
    }
    /**
     * Record a route decision
     */
    recordRoute(trace) {
        this.routeTraces.push(trace);
        // Emit event
        this.emit('route_complete', trace);
        this.emit('observability_event', { type: 'route_complete', trace });
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
            }).catch(() => { }); // Fire and forget
        }
    }
    /**
     * Generate a unique trace ID
     */
    generateTraceId() {
        return generateId();
    }
    /**
     * Get all route traces
     */
    getTraces(limit) {
        if (limit) {
            return this.routeTraces.slice(-limit);
        }
        return [...this.routeTraces];
    }
    /**
     * Get all spans for a trace
     */
    getSpans(traceId) {
        return Array.from(this.traces.values()).filter(s => s.traceId === traceId);
    }
    /**
     * Export to Langfuse (async, non-blocking)
     */
    async flushToLangfuse() {
        if (this.langfuseClient) {
            await this.langfuseClient.flush();
        }
    }
    /**
     * Clear all traces (for testing)
     */
    reset() {
        this.traces.clear();
        this.routeTraces = [];
    }
}
exports.Tracer = Tracer;
// Singleton instance
let tracerInstance = null;
function getTracer() {
    if (!tracerInstance) {
        tracerInstance = new Tracer();
    }
    return tracerInstance;
}
function createTracer() {
    tracerInstance = new Tracer();
    return tracerInstance;
}
//# sourceMappingURL=tracer.js.map