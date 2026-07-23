"use strict";
/**
 * A3M Router - HTTP Route Registry
 *
 * Pluggable route table pattern replacing monolithic if/else routing.
 * Adding a new endpoint = 1 handler file + 1 registration line.
 *
 * Usage:
 *   import { createRouter, registerRoute } from './router';
 *   registerRoute('GET', /^\/health$/, handleHealth);
 *   registerRoute('POST', /^\/v1\/chat\/completions$/, handleChatCompletions);
 *   const router = createRouter();
 *   server.use(router);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoute = registerRoute;
exports.createRequestHandler = createRequestHandler;
exports.getRegisteredRoutes = getRegisteredRoutes;
// ============================================================
// ROUTE REGISTRY
// ============================================================
const routes = [];
/**
 * Generate a short request ID.
 */
function generateRequestId() {
    return 'req-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
/**
 * Parse query string from URL.
 */
function parseQuery(url) {
    try {
        const urlObj = new URL(url, 'http://localhost');
        const query = {};
        urlObj.searchParams.forEach((value, key) => {
            query[key] = value;
        });
        return query;
    }
    catch {
        return {};
    }
}
/**
 * Parse HTTP method safely.
 */
function parseMethod(method) {
    const m = (method || 'GET').toUpperCase();
    if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(m)) {
        return m;
    }
    return 'GET';
}
/**
 * Register a route. Routes are matched in registration order.
 */
function registerRoute(method, pattern, handler, name) {
    routes.push({ method, pattern, handler, name: name || `${method} ${pattern}` });
}
/**
 * Create the request handler function for the registered routes.
 * Returns a function compatible with http.createServer's requestListener.
 */
function createRequestHandler() {
    return async function handleRequest(req, res) {
        const method = parseMethod(req.method);
        const url = req.url || '/';
        const ctx = {
            requestId: generateRequestId(),
            startTime: Date.now(),
            method,
            path: url.split('?')[0],
            query: parseQuery(url),
        };
        // CORS preflight
        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
                'Access-Control-Max-Age': '86400',
            });
            res.end();
            return;
        }
        // Find matching route
        for (const route of routes) {
            if (route.method !== method)
                continue;
            const match = ctx.path.match(route.pattern);
            if (match) {
                try {
                    await route.handler(req, res, ctx);
                }
                catch (err) {
                    console.error(`[a3m-router] Route ${route.name} error: ${err.message}`);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: { message: err.message, type: 'server_error' } }));
                    }
                }
                return;
            }
        }
        // No route matched — 404
        if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: { message: `Not found: ${method} ${url}`, type: 'not_found' } }));
        }
    };
}
/**
 * Get all registered routes (for debugging and /routes endpoint).
 */
function getRegisteredRoutes() {
    return [...routes];
}
exports.default = { registerRoute, createRequestHandler, getRegisteredRoutes };
//# sourceMappingURL=router.js.map