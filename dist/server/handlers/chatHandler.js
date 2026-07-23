"use strict";
/**
 * A3M Router - Chat Completions Handler
 *
 * Handles POST /v1/chat/completions
 * Plug-and-play: register with router.registerRoute('POST', /^\/v1\/chat\/completions$/, handleChatCompletions);
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatCompletions = handleChatCompletions;
const modelMapper_1 = require("../modelMapper");
const state_1 = require("../state");
const metrics_1 = require("../metrics");
// ============================================================
// HELPERS
// ============================================================
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}
function jsonResponse(res, statusCode, body) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify(body));
}
function errorResponse(res, statusCode, message, errorType = 'server_error') {
    jsonResponse(res, statusCode, { error: { message, type: errorType, code: statusCode } });
}
// ============================================================
// HANDLER
// ============================================================
async function handleChatCompletions(req, res, ctx) {
    (0, metrics_1.recordActiveRequest)(1);
    const body = await readBody(req);
    let request;
    try {
        request = JSON.parse(body);
    }
    catch {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 400, 'Invalid JSON in request body', 'invalid_request_error');
        return;
    }
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 400, 'messages is required and must be a non-empty array', 'invalid_request_error');
        return;
    }
    const model = request.model || 'auto';
    const stream = request.stream || false;
    const requestId = ctx.requestId;
    const promptForRouting = request.messages.map((m) => m.content).join(' ');
    const mapping = (0, modelMapper_1.resolveModel)(model, promptForRouting);
    if (!mapping) {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 503, `No provider available for model "${model}". Configure API keys.`, 'server_error');
        return;
    }
    const startTime = Date.now();
    if (stream) {
        try {
            const { streamProviderResponse } = await Promise.resolve().then(() => __importStar(require('../proxyServer')));
            await streamProviderResponse(res, mapping, request.messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, requestId);
            const latencyMs = Date.now() - startTime;
            (0, metrics_1.recordRequest)({ endpoint: '/v1/chat/completions', provider: mapping.providerId, status: 'success', durationMs: latencyMs, model });
            (0, metrics_1.recordActiveRequest)(-1);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent)
                errorResponse(res, 500, message);
            (0, metrics_1.recordProviderError)(mapping.providerId, 'stream_error');
            (0, metrics_1.recordActiveRequest)(-1);
        }
        return;
    }
    // Non-streaming path
    try {
        const { callWithFallback } = await Promise.resolve().then(() => __importStar(require('../proxyServer')));
        const { result, mapping: usedMapping } = await callWithFallback(model, request.messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, promptForRouting);
        const latencyMs = Date.now() - startTime;
        const inputCost = (result.usage.prompt_tokens / 1000) * usedMapping.costPerK.input;
        const outputCost = (result.usage.completion_tokens / 1000) * usedMapping.costPerK.output;
        const totalCost = inputCost + outputCost;
        state_1.costTracker.record(usedMapping.providerId, usedMapping.model, result.usage.prompt_tokens, result.usage.completion_tokens);
        const response = {
            id: requestId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [{ index: 0, message: { role: 'assistant', content: result.content }, finish_reason: result.finish_reason }],
            usage: result.usage,
        };
        jsonResponse(res, 200, response);
        (0, metrics_1.recordRequest)({
            endpoint: '/v1/chat/completions',
            provider: usedMapping.providerId,
            status: 'success',
            durationMs: latencyMs,
            tokensIn: result.usage.prompt_tokens,
            tokensOut: result.usage.completion_tokens,
            cost: totalCost,
            model,
        });
        console.log(`[a3m-router] ${requestId} chat model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms tokens=${result.usage.total_tokens} cost=$${totalCost.toFixed(6)}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const latencyMs = Date.now() - startTime;
        (0, metrics_1.recordRequest)({ endpoint: '/v1/chat/completions', provider: mapping.providerId, status: 'error', durationMs: latencyMs, model });
        (0, metrics_1.recordProviderError)(mapping.providerId, message.slice(0, 50));
        console.error(`[a3m-router] ${requestId} ERROR model=${model}→${mapping.providerId}/${mapping.model} latency=${latencyMs}ms error=${message}`);
        if (!res.headersSent)
            errorResponse(res, 502, message, 'upstream_error');
    }
    (0, metrics_1.recordActiveRequest)(-1);
}
exports.default = handleChatCompletions;
//# sourceMappingURL=chatHandler.js.map