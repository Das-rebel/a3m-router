"use strict";
/**
 * A3M Router - OpenAI-Compatible Proxy Server
 *
 * Lightweight HTTP server that accepts OpenAI API requests and routes them
 * through the A3M Router engine. Uses only Node.js built-in http module.
 *
 * Endpoints:
 *   POST /v1/chat/completions   — OpenAI-compatible chat
 *   POST /v1/completions        — OpenAI completions
 *   GET  /v1/models             — List available models
 *   GET  /health                — Health check with provider status
 *
 * Build: npx tsc
 * Run:   npx a3m-router serve [--port 8787]
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
exports.requestLogs = exports.costTracker = exports.CostTracker = void 0;
exports.createProxyServer = createProxyServer;
const http = __importStar(require("http"));
const modelMapper_1 = require("./modelMapper");
const providerConfig_1 = require("../providers/providerConfig");
const costTracker_1 = require("../cost/costTracker");
Object.defineProperty(exports, "CostTracker", { enumerable: true, get: function () { return costTracker_1.CostTracker; } });
// ============================================================
// HELPERS
// ============================================================
function generateId() {
    return "chatcmpl-" + Math.random().toString(36).substring(2, 14) + Date.now().toString(36);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
    });
}
function jsonResponse(res, statusCode, body) {
    const payload = JSON.stringify(body);
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end(payload);
}
function errorResponse(res, statusCode, message, errorType = "server_error") {
    jsonResponse(res, statusCode, {
        error: {
            message,
            type: errorType,
            code: statusCode,
        },
    });
}
/**
 * Call the actual LLM provider with the given messages.
 * Handles OpenAI-compatible APIs, Anthropic, Google, and local providers.
 */
async function callProvider(mapping, messages, options) {
    const { providerId, model, baseUrl, apiKey, type } = mapping;
    const maxTokens = options.max_tokens || 1024;
    // Local providers (Ollama, vLLM, LM Studio)
    if (type === "local" || type === "cli") {
        return callLocalProvider(mapping, messages, maxTokens);
    }
    // Anthropic has a different API format
    if (providerId === "anthropic") {
        return callAnthropicProvider(mapping, messages, options);
    }
    // Google Gemini has a different API format
    if (providerId === "google") {
        return callGoogleProvider(mapping, messages, options);
    }
    // Standard OpenAI-compatible API (Groq, Cerebras, Mistral, DeepSeek, OpenAI, etc.)
    return callOpenAICompatibleProvider(mapping, messages, options);
}
/**
 * Standard OpenAI-compatible API call.
 */
async function callOpenAICompatibleProvider(mapping, messages, options) {
    const { model, baseUrl, apiKey } = mapping;
    const body = {
        model,
        messages,
        max_tokens: options.max_tokens || 1024,
    };
    if (options.temperature !== undefined)
        body.temperature = options.temperature;
    if (options.stop)
        body.stop = options.stop;
    const headers = {
        "Content-Type": "application/json",
    };
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const resp = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    return {
        content: data.choices?.[0]?.message?.content || "",
        model: data.model || model,
        usage: data.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        },
        finish_reason: data.choices?.[0]?.finish_reason || "stop",
    };
}
/**
 * Anthropic Messages API call.
 */
async function callAnthropicProvider(mapping, messages, options) {
    const { model, baseUrl, apiKey } = mapping;
    // Convert OpenAI format to Anthropic format
    let systemPrompt = "";
    const anthropicMessages = [];
    for (const msg of messages) {
        if (msg.role === "system") {
            systemPrompt += (systemPrompt ? "\n" : "") + msg.content;
        }
        else {
            anthropicMessages.push({ role: msg.role, content: msg.content });
        }
    }
    const body = {
        model,
        messages: anthropicMessages,
        max_tokens: options.max_tokens || 1024,
    };
    if (systemPrompt)
        body.system = systemPrompt;
    if (options.temperature !== undefined)
        body.temperature = options.temperature;
    if (options.stop)
        body.stop_sequences = Array.isArray(options.stop) ? options.stop : [options.stop];
    const resp = await fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey || "",
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    const content = data.content?.[0]?.text || "";
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    return {
        content,
        model: data.model || model,
        usage: {
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
        },
        finish_reason: data.stop_reason || "stop",
    };
}
/**
 * Google Gemini API call.
 */
async function callGoogleProvider(mapping, messages, options) {
    const { model, apiKey } = mapping;
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    // Convert OpenAI format to Gemini format
    const contents = [];
    let systemInstruction = null;
    for (const msg of messages) {
        if (msg.role === "system") {
            systemInstruction = { parts: [{ text: msg.content }] };
        }
        else {
            contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            });
        }
    }
    const body = {
        contents,
        generationConfig: {
            maxOutputTokens: options.max_tokens || 1024,
        },
    };
    if (systemInstruction)
        body.systemInstruction = systemInstruction;
    if (options.temperature !== undefined)
        body.generationConfig.temperature = options.temperature;
    if (options.stop)
        body.generationConfig.stopSequences = Array.isArray(options.stop) ? options.stop : [options.stop];
    const resp = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const tokensIn = data.usageMetadata?.promptTokenCount || 0;
    const tokensOut = data.usageMetadata?.candidatesTokenCount || 0;
    return {
        content,
        model,
        usage: {
            prompt_tokens: tokensIn,
            completion_tokens: tokensOut,
            total_tokens: tokensIn + tokensOut,
        },
        finish_reason: data.candidates?.[0]?.finishReason || "stop",
    };
}
/**
 * Local provider call (Ollama, vLLM, LM Studio).
 */
async function callLocalProvider(mapping, messages, maxTokens) {
    const { model, baseUrl, providerId } = mapping;
    // Ollama uses /api/chat
    if (providerId === "ollama") {
        const ollamaUrl = (baseUrl || "http://127.0.0.1:11434/api/chat").replace("/api/generate", "/api/chat");
        const resp = await fetch(ollamaUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, stream: false, options: { num_predict: maxTokens } }),
        });
        const data = await resp.json();
        return {
            content: data.message?.content || "",
            model,
            usage: { prompt_tokens: data.prompt_eval_count || 0, completion_tokens: data.eval_count || 0, total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0) },
            finish_reason: "stop",
        };
    }
    // vLLM and LM Studio use OpenAI-compatible API
    const resp = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    return {
        content: data.choices?.[0]?.message?.content || "",
        model: data.model || model,
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        finish_reason: data.choices?.[0]?.finish_reason || "stop",
    };
}
// ============================================================
// STREAMING SUPPORT
// ============================================================
/**
 * Stream a provider response as SSE chunks.
 */
async function streamProviderResponse(res, mapping, messages, options, requestId) {
    const { model, baseUrl, apiKey, type, providerId } = mapping;
    const maxTokens = options.max_tokens || 1024;
    // Set SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    // Build request body
    const body = { model, messages, max_tokens: maxTokens, stream: true };
    if (options.temperature !== undefined)
        body.temperature = options.temperature;
    if (options.stop)
        body.stop = options.stop;
    const headers = { "Content-Type": "application/json" };
    // Provider-specific header setup
    if (providerId === "anthropic") {
        headers["x-api-key"] = apiKey || "";
        headers["anthropic-version"] = "2023-06-01";
        // Anthropic streaming format is different but we handle it below
    }
    else if (providerId === "google") {
        // Google doesn't support SSE streaming in the same way; fall back to non-streaming
        try {
            const result = await callProvider(mapping, messages, { ...options, stream: false });
            const chunk = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: result.model,
                choices: [{ index: 0, delta: { content: result.content }, finish_reason: null }],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            const doneChunk = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: result.model,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            };
            res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
        }
        catch (err) {
            const errorChunk = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, delta: { content: `Error: ${err.message}` }, finish_reason: "stop" }],
            };
            res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
        }
        return;
    }
    else if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }
    // Determine the correct URL for streaming
    let streamUrl = baseUrl;
    // Anthropic streaming URL is the same but we need to set stream: true
    if (providerId === "anthropic") {
        body.stream = true;
    }
    // Ollama streaming
    if (providerId === "ollama") {
        streamUrl = (baseUrl || "http://127.0.0.1:11434/api/chat").replace("/api/generate", "/api/chat");
        body.stream = true;
    }
    try {
        const resp = await fetch(streamUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            const errorChunk = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, delta: { content: `Error: ${resp.status} ${errText.substring(0, 200)}` }, finish_reason: "stop" }],
            };
            res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }
        if (!resp.body) {
            // No streaming body available; fall back to reading full response
            const text = await resp.text();
            try {
                const data = JSON.parse(text);
                const content = providerId === "anthropic"
                    ? (data.content?.map((c) => c.text).join("") || "")
                    : (data.choices?.[0]?.message?.content || text);
                const chunk = {
                    id: requestId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: { content }, finish_reason: null }],
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            catch {
                const chunk = {
                    id: requestId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            const doneChunk = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            };
            res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }
        // Stream the response through
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            // Process SSE lines from the upstream provider
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                const trimmed = line.trim();
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith(":"))
                    continue;
                // If the upstream is already sending SSE format, relay it (replacing the ID)
                if (trimmed.startsWith("data: ")) {
                    const payload = trimmed.substring(6);
                    // Check for [DONE]
                    if (payload === "[DONE]") {
                        res.write("data: [DONE]\n\n");
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(payload);
                        // Normalize the chunk to OpenAI format
                        const normalizedChunk = {
                            id: requestId,
                            object: "chat.completion.chunk",
                            created: Math.floor(Date.now() / 1000),
                            model: parsed.model || model,
                            choices: [],
                        };
                        // OpenAI/Groq/Cerebras format
                        if (parsed.choices?.[0]?.delta) {
                            normalizedChunk.choices = parsed.choices;
                        }
                        else if (parsed.choices?.[0]?.text) {
                            normalizedChunk.choices = [{
                                    index: 0,
                                    delta: { content: parsed.choices[0].text },
                                    finish_reason: null,
                                }];
                        }
                        // Anthropic streaming format
                        else if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                            normalizedChunk.choices = [{
                                    index: 0,
                                    delta: { content: parsed.delta.text },
                                    finish_reason: null,
                                }];
                        }
                        else if (parsed.type === "message_stop") {
                            normalizedChunk.choices = [{ index: 0, delta: {}, finish_reason: "stop" }];
                        }
                        // Ollama streaming format
                        else if (parsed.message?.content) {
                            normalizedChunk.choices = [{
                                    index: 0,
                                    delta: { content: parsed.message.content },
                                    finish_reason: parsed.done ? "stop" : null,
                                }];
                        }
                        else {
                            // Unknown format — relay as-is with our ID
                            normalizedChunk.choices = [{
                                    index: 0,
                                    delta: { content: JSON.stringify(parsed) },
                                    finish_reason: null,
                                }];
                        }
                        res.write(`data: ${JSON.stringify(normalizedChunk)}\n\n`);
                    }
                    catch {
                        // Non-JSON data — relay as content
                        const fallbackChunk = {
                            id: requestId,
                            object: "chat.completion.chunk",
                            created: Math.floor(Date.now() / 1000),
                            model,
                            choices: [{ index: 0, delta: { content: payload }, finish_reason: null }],
                        };
                        res.write(`data: ${JSON.stringify(fallbackChunk)}\n\n`);
                    }
                }
            }
        }
        // Ensure [DONE] is sent
        res.write("data: [DONE]\n\n");
        res.end();
    }
    catch (err) {
        const errorChunk = {
            id: requestId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: { content: `Stream error: ${err.message}` }, finish_reason: "stop" }],
        };
        res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
    }
}
// ============================================================
// FALLBACK CHAIN
// ============================================================
/**
 * Try the primary mapping, then fall back to alternatives.
 */
async function callWithFallback(model, messages, options, prompt) {
    const mapping = (0, modelMapper_1.resolveModel)(model, prompt);
    if (!mapping) {
        throw new Error(`No provider available for model "${model}". Check your API keys and provider configuration.`);
    }
    // Try primary
    try {
        const result = await callProvider(mapping, messages, options);
        return { result, mapping };
    }
    catch (primaryError) {
        console.error(`[a3m-proxy] Primary provider ${mapping.providerId} failed: ${primaryError.message}`);
    }
    // Try fallback providers
    const available = (0, providerConfig_1.getAvailableProviders)();
    for (const [providerId, provider] of Object.entries(available)) {
        if (providerId === mapping.providerId)
            continue;
        if (provider.type !== "api")
            continue;
        if (!provider.apiKey)
            continue;
        if (!provider.models || provider.models.length === 0)
            continue;
        const fallbackMapping = {
            providerId,
            model: provider.models[0],
            baseUrl: provider.baseUrl || "",
            apiKey: provider.apiKey || null,
            costPerK: provider.costPerK || { input: 0, output: 0 },
            type: provider.type || "api",
        };
        try {
            const result = await callProvider(fallbackMapping, messages, options);
            return { result, mapping: fallbackMapping };
        }
        catch (fallbackError) {
            console.error(`[a3m-proxy] Fallback provider ${providerId} failed: ${fallbackError.message}`);
        }
    }
    throw new Error(`All providers failed for model "${model}". Check your API keys.`);
}
// ============================================================
// REQUEST HANDLERS
// ============================================================
const requestLogs = [];
exports.requestLogs = requestLogs;
const costTracker = new costTracker_1.CostTracker();
exports.costTracker = costTracker;
/**
 * Handle POST /v1/chat/completions
 */
async function handleChatCompletions(req, res) {
    const body = await readBody(req);
    let request;
    try {
        request = JSON.parse(body);
    }
    catch {
        errorResponse(res, 400, "Invalid JSON in request body", "invalid_request_error");
        return;
    }
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
        errorResponse(res, 400, "messages is required and must be a non-empty array", "invalid_request_error");
        return;
    }
    const model = request.model || "auto";
    const stream = request.stream || false;
    const requestId = generateId();
    // Build the prompt from messages for routing
    const promptForRouting = request.messages.map((m) => m.content).join(" ");
    // Resolve model
    const mapping = (0, modelMapper_1.resolveModel)(model, promptForRouting);
    if (!mapping) {
        errorResponse(res, 503, `No provider available for model "${model}". Configure API keys.`, "server_error");
        return;
    }
    const startTime = Date.now();
    if (stream) {
        // Streaming response
        try {
            await streamProviderResponse(res, mapping, request.messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, requestId);
            const latencyMs = Date.now() - startTime;
            logRequest({
                id: requestId,
                model,
                resolvedProvider: mapping.providerId,
                resolvedModel: mapping.model,
                latencyMs,
                tokensIn: 0,
                tokensOut: 0,
                cost: 0,
                status: "success",
                timestamp: Date.now(),
            });
            console.log(`[a3m-proxy] ${requestId} stream model=${model}→${mapping.providerId}/${mapping.model} latency=${latencyMs}ms`);
        }
        catch (err) {
            if (!res.headersSent) {
                errorResponse(res, 500, err.message);
            }
        }
    }
    else {
        // Non-streaming response
        try {
            const { result, mapping: usedMapping } = await callWithFallback(model, request.messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, promptForRouting);
            const latencyMs = Date.now() - startTime;
            const inputCost = (result.usage.prompt_tokens / 1000) * (usedMapping.costPerK.input);
            const outputCost = (result.usage.completion_tokens / 1000) * (usedMapping.costPerK.output);
            const totalCost = inputCost + outputCost;
            // Track cost
            costTracker.record(usedMapping.providerId, usedMapping.model, result.usage.prompt_tokens, result.usage.completion_tokens);
            const response = {
                id: requestId,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: result.model,
                choices: [
                    {
                        index: 0,
                        message: { role: "assistant", content: result.content },
                        finish_reason: result.finish_reason,
                    },
                ],
                usage: result.usage,
            };
            jsonResponse(res, 200, response);
            logRequest({
                id: requestId,
                model,
                resolvedProvider: usedMapping.providerId,
                resolvedModel: usedMapping.model,
                latencyMs,
                tokensIn: result.usage.prompt_tokens,
                tokensOut: result.usage.completion_tokens,
                cost: totalCost,
                status: "success",
                timestamp: Date.now(),
            });
            console.log(`[a3m-proxy] ${requestId} model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms tokens=${result.usage.total_tokens} cost=$${totalCost.toFixed(6)}`);
        }
        catch (err) {
            const latencyMs = Date.now() - startTime;
            logRequest({
                id: requestId,
                model,
                resolvedProvider: mapping.providerId,
                resolvedModel: mapping.model,
                latencyMs,
                tokensIn: 0,
                tokensOut: 0,
                cost: 0,
                status: "error",
                error: err.message,
                timestamp: Date.now(),
            });
            console.error(`[a3m-proxy] ${requestId} ERROR model=${model}→${mapping.providerId}/${mapping.model} latency=${latencyMs}ms error=${err.message}`);
            if (!res.headersSent) {
                errorResponse(res, 502, err.message, "upstream_error");
            }
        }
    }
}
/**
 * Handle POST /v1/completions
 */
async function handleCompletions(req, res) {
    const body = await readBody(req);
    let request;
    try {
        request = JSON.parse(body);
    }
    catch {
        errorResponse(res, 400, "Invalid JSON in request body", "invalid_request_error");
        return;
    }
    // Convert prompt to messages format
    const prompts = Array.isArray(request.prompt) ? request.prompt : [request.prompt || ""];
    const messages = prompts.map((p) => ({ role: "user", content: p }));
    const model = request.model || "auto";
    const stream = request.stream || false;
    const requestId = generateId();
    const promptForRouting = prompts.join(" ");
    const mapping = (0, modelMapper_1.resolveModel)(model, promptForRouting);
    if (!mapping) {
        errorResponse(res, 503, `No provider available for model "${model}".`, "server_error");
        return;
    }
    const startTime = Date.now();
    if (stream) {
        await streamProviderResponse(res, mapping, messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, requestId);
    }
    else {
        try {
            const { result, mapping: usedMapping } = await callWithFallback(model, messages, { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop }, promptForRouting);
            const latencyMs = Date.now() - startTime;
            const response = {
                id: requestId,
                object: "text_completion",
                created: Math.floor(Date.now() / 1000),
                model: result.model,
                choices: [
                    {
                        text: result.content,
                        index: 0,
                        finish_reason: result.finish_reason,
                    },
                ],
                usage: result.usage,
            };
            jsonResponse(res, 200, response);
            costTracker.record(usedMapping.providerId, usedMapping.model, result.usage.prompt_tokens, result.usage.completion_tokens);
            console.log(`[a3m-proxy] ${requestId} completion model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms`);
        }
        catch (err) {
            if (!res.headersSent) {
                errorResponse(res, 502, err.message, "upstream_error");
            }
        }
    }
}
/**
 * Handle GET /v1/models
 */
function handleModels(res) {
    const models = (0, modelMapper_1.listAvailableModels)();
    jsonResponse(res, 200, {
        object: "list",
        data: models,
    });
}
/**
 * Handle GET /health
 */
async function handleHealth(res) {
    const available = (0, providerConfig_1.getAvailableProviders)();
    const providerStatus = {};
    let healthyCount = 0;
    // Quick health check — just report if API keys exist
    for (const [id, provider] of Object.entries(available)) {
        const hasKey = !!provider.apiKey;
        const isAvailable = provider.type !== "api" || hasKey;
        providerStatus[id] = {
            name: provider.name || id,
            type: provider.type,
            models: provider.models?.length || 0,
            available: isAvailable,
        };
        if (isAvailable)
            healthyCount++;
    }
    const costSummary = costTracker.getSummary();
    jsonResponse(res, 200, {
        status: "ok",
        version: "2.0.0",
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
        recentRequests: requestLogs.slice(-20),
    });
}
/**
 * Log a request for the /health endpoint.
 */
function logRequest(entry) {
    requestLogs.push(entry);
    // Keep only the last 1000 entries
    if (requestLogs.length > 1000) {
        requestLogs.splice(0, requestLogs.length - 1000);
    }
}
// ============================================================
// SERVER CREATION
// ============================================================
/**
 * Create and start the proxy server.
 *
 * @param port - Port to listen on (default: 8787, env: PORT)
 * @returns The http.Server instance
 */
function createProxyServer(port) {
    const listenPort = port || parseInt(process.env.PORT || "8787", 10);
    const server = http.createServer(async (req, res) => {
        const method = req.method || "GET";
        const url = req.url || "/";
        // CORS preflight
        if (method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",
            });
            res.end();
            return;
        }
        try {
            // Route: POST /v1/chat/completions
            if (method === "POST" && url === "/v1/chat/completions") {
                await handleChatCompletions(req, res);
                return;
            }
            // Route: POST /v1/completions
            if (method === "POST" && url === "/v1/completions") {
                await handleCompletions(req, res);
                return;
            }
            // Route: GET /v1/models
            if (method === "GET" && url === "/v1/models") {
                handleModels(res);
                return;
            }
            // Route: GET /health
            if (method === "GET" && url === "/health") {
                await handleHealth(res);
                return;
            }
            // Route: GET /cost — daywise usage breakdown
            if (method === "GET" && url === "/cost") {
                const summary = costTracker.getSummary();
                jsonResponse(res, 200, {
                    total: summary.total_cost,
                    requests: summary.request_count,
                    daily: summary.daily_costs,
                    monthly: summary.monthly_costs,
                    by_provider: summary.by_provider,
                    by_model: summary.by_model,
                    tokens: summary.token_count,
                    avg_per_request: summary.average_cost_per_request,
                });
                return;
            }
            // 404 for everything else
            errorResponse(res, 404, `Not found: ${method} ${url}`, "not_found");
        }
        catch (err) {
            console.error(`[a3m-proxy] Unhandled error: ${err.message}`);
            if (!res.headersSent) {
                errorResponse(res, 500, err.message);
            }
        }
    });
    server.listen(listenPort, () => {
        console.log(``);
        console.log(`  A3M Router Proxy Server`);
        console.log(`  ─────────────────────────────────────────`);
        console.log(`  Listening:  http://localhost:${listenPort}`);
        console.log(`  Endpoints:`);
        console.log(`    POST /v1/chat/completions  (OpenAI chat)`);
        console.log(`    POST /v1/completions       (OpenAI completions)`);
        console.log(`    GET  /v1/models            (List models)`);
        console.log(`    GET  /health               (Health check)`);
        console.log(``);
        console.log(`  Example:`);
        console.log(`    curl http://localhost:${listenPort}/v1/chat/completions \\`);
        console.log(`      -H "Content-Type: application/json" \\`);
        console.log(`      -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'`);
        console.log(``);
    });
    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`[a3m-proxy] Port ${listenPort} is already in use. Use --port or PORT env var.`);
            process.exit(1);
        }
        else {
            console.error(`[a3m-proxy] Server error: ${err.message}`);
        }
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log(`\n[a3m-proxy] Shutting down...`);
        server.close(() => {
            console.log(`[a3m-proxy] Server closed.`);
            process.exit(0);
        });
        // Force close after 5s
        setTimeout(() => {
            console.error(`[a3m-proxy] Forced shutdown after timeout.`);
            process.exit(1);
        }, 5000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    return server;
}
exports.default = createProxyServer;
//# sourceMappingURL=proxyServer.js.map