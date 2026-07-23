"use strict";
/**
 * A3M Router - Health Handler
 *
 * Handles GET /health
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHealth = handleHealth;
const providerConfig_1 = require("../../providers/providerConfig");
const state_1 = require("../state");
function jsonResponse(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(body));
}
async function handleHealth(_req, res, _ctx) {
    const available = (0, providerConfig_1.getAvailableProviders)();
    const providerStatus = {};
    let healthyCount = 0;
    for (const [id, provider] of Object.entries(available)) {
        const hasKey = !!provider.apiKey;
        const isAvailable = provider.type !== 'api' || hasKey;
        providerStatus[id] = {
            name: provider.name || id,
            type: provider.type,
            models: provider.models?.length || 0,
            available: isAvailable,
        };
        if (isAvailable)
            healthyCount++;
    }
    const costSummary = state_1.costTracker.getSummary();
    jsonResponse(res, 200, {
        status: 'ok',
        version: '2.14.60',
        providers: {
            total: Object.keys(available).length,
            healthy: healthyCount,
            details: providerStatus,
        },
        cost: {
            total: costSummary.total_cost,
            requests: costSummary.request_count,
        },
        uptime: process.uptime(),
        recentRequests: state_1.requestLogs.slice(-20),
    });
}
exports.default = handleHealth;
//# sourceMappingURL=healthHandler.js.map