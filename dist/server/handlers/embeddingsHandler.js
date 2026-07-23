"use strict";
/**
 * A3M Router - Embeddings Handler
 *
 * Handles POST /v1/embeddings
 * OpenAI-compatible embeddings endpoint.
 *
 * Routes embedding requests to the best available provider:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002)
 * - Cohere (embed-english-v3.0, embed-multilingual-v3.0)
 * - Google (text-embedding-004)
 * - Local Ollama (nomic-embed-text, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmbeddings = handleEmbeddings;
const providerConfig_1 = require("../../providers/providerConfig");
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
/**
 * Get the best available embeddings provider.
 */
function getEmbeddingsProvider() {
    const providers = (0, providerConfig_1.getAvailableProviders)();
    // Priority: OpenAI > Cohere > Google > Ollama
    const priority = ['openai', 'cohere', 'google', 'ollama'];
    for (const id of priority) {
        const provider = providers[id];
        if (!provider || !provider.apiKey)
            continue;
        if (id === 'openai') {
            return {
                providerId: 'openai',
                model: 'text-embedding-3-small',
                adapter: openAIAdapter,
            };
        }
        if (id === 'cohere') {
            return {
                providerId: 'cohere',
                model: 'embed-english-v3.0',
                adapter: cohereAdapter,
            };
        }
        if (id === 'google') {
            return {
                providerId: 'google',
                model: 'text-embedding-004',
                adapter: googleAdapter,
            };
        }
        if (id === 'ollama' && provider.baseUrl) {
            return {
                providerId: 'ollama',
                model: 'nomic-embed-text:latest',
                adapter: ollamaAdapter,
            };
        }
    }
    return null;
}
// ============================================================
// PROVIDER ADAPTERS
// ============================================================
const openAIAdapter = {
    modelMap(model) {
        const valid = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
        return valid.includes(model) ? model : 'text-embedding-3-small';
    },
    urlFor(_apiKey, _model) {
        return 'https://api.openai.com/v1/embeddings';
    },
    async call(url, apiKey, model, input, dimensions) {
        const body = { model, input };
        if (dimensions)
            body.dimensions = dimensions;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (data.error)
            throw new Error(data.error.message || JSON.stringify(data.error));
        return data.data.map((item) => item.embedding);
    },
};
const cohereAdapter = {
    modelMap(model) {
        const valid = ['embed-english-v3.0', 'embed-multilingual-v3.0', 'embed-english-v2.0'];
        return valid.includes(model) ? model : 'embed-english-v3.0';
    },
    urlFor(_apiKey, _model) {
        return 'https://api.cohere.ai/v2/embed';
    },
    async call(url, apiKey, model, input, _dimensions) {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, texts: input }),
        });
        const data = await resp.json();
        if (data.error)
            throw new Error(data.error.message || JSON.stringify(data.error));
        return data.embeddings;
    },
};
const googleAdapter = {
    modelMap(model) {
        return 'text-embedding-004';
    },
    urlFor(apiKey, _model) {
        return `https://generativelanguage.googleapis.com/v1beta2/models/text-embedding-004:predict?key=${apiKey}`;
    },
    async call(url, _apiKey, model, input, _dimensions) {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: input.map((text) => ({ content: text })),
                parameters: { outputDimensionality: 768 },
            }),
        });
        const data = await resp.json();
        if (data.error)
            throw new Error(data.error.message || JSON.stringify(data.error));
        return data.predictions.map((p) => p.embeddings.values);
    },
};
const ollamaAdapter = {
    modelMap(model) {
        return model || 'nomic-embed-text:latest';
    },
    urlFor(baseUrl) {
        return `${baseUrl}/api/embeddings`;
    },
    async call(url, _apiKey, model, input) {
        const results = [];
        for (const text of input) {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: text }),
            });
            const data = await resp.json();
            if (data.error)
                throw new Error(data.error);
            results.push(data.embedding);
        }
        return results;
    },
};
// ============================================================
// HANDLER
// ============================================================
async function handleEmbeddings(req, res, ctx) {
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
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    if (inputs.length === 0) {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 400, 'input is required', 'invalid_request_error');
        return;
    }
    const provider = getEmbeddingsProvider();
    if (!provider) {
        (0, metrics_1.recordActiveRequest)(-1);
        errorResponse(res, 503, 'No embeddings provider available. Configure API keys for OpenAI, Cohere, or Google.', 'server_error');
        return;
    }
    const model = request.model || provider.model;
    const adapter = provider.adapter;
    const providers = (0, providerConfig_1.getAvailableProviders)();
    const providerConfig = providers[provider.providerId];
    const resolvedModel = adapter.modelMap(model) || provider.model;
    const url = adapter.urlFor(providerConfig.apiKey || '', resolvedModel);
    const startTime = Date.now();
    try {
        const embeddings = await adapter.call(url, providerConfig.apiKey || '', resolvedModel, inputs, request.dimensions);
        const latencyMs = Date.now() - startTime;
        const response = {
            object: 'list',
            data: embeddings.map((embedding, i) => ({
                object: 'embedding',
                embedding,
                index: i,
            })),
            model: resolvedModel,
            usage: {
                prompt_tokens: 0, // Embedding APIs don't always return token counts
                total_tokens: 0,
            },
        };
        jsonResponse(res, 200, response);
        (0, metrics_1.recordRequest)({
            endpoint: '/v1/embeddings',
            provider: provider.providerId,
            status: 'success',
            durationMs: latencyMs,
            model: resolvedModel,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!res.headersSent)
            errorResponse(res, 502, message, 'upstream_error');
        (0, metrics_1.recordProviderError)(provider.providerId, 'embeddings_error');
        console.error(`[a3m-router] ${ctx.requestId} embeddings ERROR ${provider.providerId}: ${message}`);
    }
    (0, metrics_1.recordActiveRequest)(-1);
}
exports.default = handleEmbeddings;
//# sourceMappingURL=embeddingsHandler.js.map