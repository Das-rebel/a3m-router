import { Request, Response, NextFunction } from 'express';
import { getTracer, createTracer } from './tracer';
import { getMetrics, createMetricsCollector } from './metrics';

/**
 * Express middleware for observability
 * - Adds trace ID to all requests
 * - Records request/response metrics
 * - Attaches span context
 */
export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tracer = getTracer();
  const metrics = getMetrics();

  // Generate or extract trace ID
  const traceId = (req.headers['x-trace-id'] as string) || tracer.generateTraceId();

  // Attach to request object
  (req as any).traceId = traceId;
  (req as any).spanId = null;

  // Add trace ID to response headers
  res.setHeader('X-Trace-ID', traceId);

  // Start span for this request
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  (req as any).spanId = span.spanId;
  (req as any).span = span;

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
    const model = (req as any).model || 'unknown';
    const provider = (req as any).provider || 'unknown';
    const cacheHit = (req as any).cacheHit || false;
    const tier = (req as any).tier || 'standard';

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
export function observabilityPlugin(
  instance: any,
  options: any,
  next: (err?: Error) => void
): void {
  instance.addHook('onRequest', async (request: any, reply: any) => {
    const tracer = getTracer();
    const metrics = getMetrics();

    const traceId = request.headers['x-trace-id'] || tracer.generateTraceId();
    request.traceId = traceId;

    reply.header('X-Trace-ID', traceId);

    const span = tracer.startSpan(`${request.method} ${request.url}`);
    request.spanId = span.spanId;
    request.span = span;
    request.startTime = Date.now();
  });

  instance.addHook('onResponse', async (request: any, reply: any) => {
    const tracer = getTracer();
    const metrics = getMetrics();

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
export function budgetAlertMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tracer = getTracer();

  // Hook into cost tracking to emit budget warnings
  tracer.on('route_complete', (trace: any) => {
    // This would be connected to budget enforcement in practice
    // For now just a placeholder for the event hook
  });

  next();
}