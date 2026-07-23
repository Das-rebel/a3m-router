"use strict";
/**
 * A3M Router - Completions Handler
 *
 * Handles POST /v1/completions
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
exports.handleCompletions = handleCompletions;
const modelMapper_1 = require("../modelMapper");
const metrics_1 = require("../metrics");
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}
function jsonResponse(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(body));
}
function errorResponse(res, statusCode, message, errorType = 'server_error') {
    jsonResponse(res, statusCode, { error: { message, type: errorType, code: statusCode } });
}
async function handleCompletions(req, res, ctx) {
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
    const prompts = Array.isArray(request.prompt) ? request.prompt : [request.prompt || ''];
    const messages = prompts.map((p) => ({ role: 'user', content: p }));
    const model = request.model || 'auto';
    const stream = request.stream || false;
    const requestId = ctx.requestId;
    const promptForRouting = prompts.join(' ');
    const mapping = (0, modelMapper_1.resolveModel)(model, promptForRouting);
    if (!mapping) {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 503, `No provider available for model "${model}".`, 'server_error');
        return;
    }
    const startTime = Date.now();
    if (stream) {
        try {
            const { streamProviderResponse } = await Promise.resolve().then(() => __importStar(require('../proxyServer')));
            await streamProviderResponse(res, mapping, messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, requestId);
            const latencyMs = Date.now() - startTime;
            (0, metrics_1.recordRequest)({ endpoint: '/v1/completions', provider: mapping.providerId, status: 'success', durationMs: latencyMs, model });
            (0, metrics_1.recordActiveRequest)(-1);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent)
                errorResponse(res, 500, message);
            (0, metrics_1.recordActiveRequest)(-1);
        }
        return;
    }
    try {
        const { callWithFallback } = await Promise.resolve().then(() => __importStar(require('../proxyServer')));
        const { result, mapping: usedMapping } = await callWithFallback(model, messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, promptForRouting);
        const latencyMs = Date.now() - startTime;
        const response = {
            id: requestId,
            object: 'text_completion',
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [{ text: result.content, index: 0, finish_reason: result.finish_reason }],
            usage: result.usage,
        };
        jsonResponse(res, 200, response);
        (0, metrics_1.recordRequest)({ endpoint: '/v1/completions', provider: usedMapping.providerId, status: 'success', durationMs: latencyMs, tokensIn: result.usage.prompt_tokens, tokensOut: result.usage.completion_tokens, model });
        console.log(`[a3m-router] ${requestId} completion model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!res.headersSent)
            errorResponse(res, 502, message, 'upstream_error');
    }
    (0, metrics_1.recordActiveRequest)(-1);
}
exports.default = handleCompletions;
//# sourceMappingURL=completionsHandler.js.map