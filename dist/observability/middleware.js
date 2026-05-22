"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observabilityMiddleware = observabilityMiddleware;
exports.observabilityPlugin = observabilityPlugin;
exports.budgetAlertMiddleware = budgetAlertMiddleware;
const tracer_1 = require("./tracer");
const metrics_1 = require("./metrics");
/**
 * Express middleware for observability
 * - Adds trace ID to all requests
 * - Records request/response metrics
 * - Attaches span context
 */
function observabilityMiddleware(req, res, next) {
    const tracer = (0, tracer_1.getTracer)();
    const metrics = (0, metrics_1.getMetrics)();
    // Generate or extract trace ID
    const traceId = req.headers['x-trace-id'] || tracer.generateTraceId();
    // Attach to request object
    req.traceId = traceId;
    req.spanId = null;
    // Add trace ID to response headers
    res.setHeader('X-Trace-ID', traceId);
    // Start span for this request
    const span = tracer.startSpan(`${req.method} ${req.path}`);
    req.spanId = span.spanId;
    req.span = span;
    // Record start time for latency calculation
    const startTime = Date.now();
    // Hook into response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        // End the span
        tracer.endSpan(span.spanId, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: duration,
        });
        // Record metrics
        const model = req.model || 'unknown';
        const provider = req.provider || 'unknown';
        const cacheHit = req.cacheHit || false;
        const tier = req.tier || 'standard';
        // Request counter
        metrics.incrementCounter('a3m_router_requests_total', {
            model,
            provider,
            tier,
            cache_hit: String(cacheHit),
        });
        // Latency histogram (convert to seconds)
        metrics.recordHistogram('a3m_request_latency_seconds', duration / 1000, {
            model,
            provider,
        });
        // Error counter
        if (res.statusCode >= 400) {
            metrics.incrementCounter('a3m_router_errors_total', {
                provider,
                error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
            });
        }
    });
    next();
}
/**
 * Fastify plugin for observability middleware
 */
function observabilityPlugin(instance, options, next) {
    instance.addHook('onRequest', async (request, reply) => {
        const tracer = (0, tracer_1.getTracer)();
        const metrics = (0, metrics_1.getMetrics)();
        const traceId = request.headers['x-trace-id'] || tracer.generateTraceId();
        request.traceId = traceId;
        reply.header('X-Trace-ID', traceId);
        const span = tracer.startSpan(`${request.method} ${request.url}`);
        request.spanId = span.spanId;
        request.span = span;
        request.startTime = Date.now();
    });
    instance.addHook('onResponse', async (request, reply) => {
        const tracer = (0, tracer_1.getTracer)();
        const metrics = (0, metrics_1.getMetrics)();
        const duration = Date.now() - request.startTime;
        if (request.spanId) {
            tracer.endSpan(request.spanId, {
                method: request.method,
                path: request.url,
                statusCode: reply.statusCode,
                durationMs: duration,
            });
        }
        const model = request.model || 'unknown';
        const provider = request.provider || 'unknown';
        const cacheHit = request.cacheHit || false;
        const tier = request.tier || 'standard';
        metrics.incrementCounter('a3m_router_requests_total', {
            model,
            provider,
            tier,
            cache_hit: String(cacheHit),
        });
        metrics.recordHistogram('a3m_request_latency_seconds', duration / 1000, {
            model,
            provider,
        });
        if (reply.statusCode >= 400) {
            metrics.incrementCounter('a3m_router_errors_total', {
                provider,
                error_type: reply.statusCode >= 500 ? 'server_error' : 'client_error',
            });
        }
    });
    next();
}
/**
 * Middleware for budget warning alerts
 */
function budgetAlertMiddleware(req, res, next) {
    const tracer = (0, tracer_1.getTracer)();
    // Hook into cost tracking to emit budget warnings
    tracer.on('route_complete', (trace) => {
        // This would be connected to budget enforcement in practice
        // For now just a placeholder for the event hook
    });
    next();
}
//# sourceMappingURL=middleware.js.map