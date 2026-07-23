/**
 * A3M Router - Prometheus Metrics Handler
 *
 * Handles GET /metrics
 * Returns Prometheus-compatible metrics output.
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { generatePrometheusMetrics } from '../metrics';

function textResponse(res: http.ServerResponse, statusCode: number, body: string): void {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

export function handleMetrics(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _ctx: RouteContext
): void {
  const output = generatePrometheusMetrics();
  textResponse(res, 200, output);
}

export default handleMetrics;
