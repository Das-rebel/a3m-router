"use strict";
/**
 * A3M Router - Prometheus Metrics Handler
 *
 * Handles GET /metrics
 * Returns Prometheus-compatible metrics output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMetrics = handleMetrics;
const metrics_1 = require("../metrics");
function textResponse(res, statusCode, body) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
    });
    res.end(body);
}
function handleMetrics(_req, res, _ctx) {
    const output = (0, metrics_1.generatePrometheusMetrics)();
    textResponse(res, 200, output);
}
exports.default = handleMetrics;
//# sourceMappingURL=metricsHandler.js.map