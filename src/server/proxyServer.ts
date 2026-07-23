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

import * as http from 'http';
import { resolveModel, listAvailableModels, ModelMapping } from './modelMapper';
import { getAvailableProviders, healthCheck as providerHealthCheck } from '../providers/providerConfig';
import { costTracker, requestLogs, RequestLog } from './state';
import { registerRoute, createRequestHandler } from './router';
import { handleChatCompletions } from './handlers/chatHandler';
import { handleCompletions } from './handlers/completionsHandler';
import { handleModels } from './handlers/modelsHandler';
import { handleHealth } from './handlers/healthHandler';
import { handleMetrics } from './handlers/metricsHandler';
import { handleEmbeddings } from './handlers/embeddingsHandler';

// ============================================================
// TYPES
// ============================================================

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
}

interface CompletionRequest {
  model: string;
  prompt: string | string[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  echo?: boolean;
  stop?: string | string[];
}



// ============================================================
// HELPERS
// ============================================================

function generateId(): string {
  return "chatcmpl-" + Math.random().toString(36).substring(2, 14) + Date.now().toString(36);
}

/**
 * Validate that a URL is safe to fetch (http/https only).
 * Prevents SSRF via file://, javascript:, data:, etc.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function jsonResponse(res: http.ServerResponse, statusCode: number, body: any): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(payload);
}

function errorResponse(res: http.ServerResponse, statusCode: number, message: string, errorType: string = "server_error"): void {
  jsonResponse(res, statusCode, {
    error: {
      message,
      type: errorType,
      code: statusCode,
    },
  });
}

// ============================================================
// PROVIDER CALL
// ============================================================

interface ProviderCallResult {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finish_reason: string;
}

/**
 * Call the actual LLM provider with the given messages.
 * Handles OpenAI-compatible APIs, Anthropic, Google, and local providers.
 */
export async function callProvider(
  mapping: ModelMapping,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stream?: boolean; stop?: string | string[] }
): Promise<ProviderCallResult> {
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
async function callOpenAICompatibleProvider(
  mapping: ModelMapping,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stream?: boolean; stop?: string | string[] }
): Promise<ProviderCallResult> {
  const { model, baseUrl, apiKey } = mapping;

  if (!isValidUrl(baseUrl)) {
    throw new Error('Invalid provider baseUrl: ' + baseUrl);
  }

  const body: any = {
    model,
    messages,
    max_tokens: options.max_tokens || 1024,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.stop) body.stop = options.stop;

  const headers: Record<string, string> = {
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

  const data = await resp.json() as any;

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
async function callAnthropicProvider(
  mapping: ModelMapping,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stream?: boolean; stop?: string | string[] }
): Promise<ProviderCallResult> {
  const { model, baseUrl, apiKey } = mapping;

  // Convert OpenAI format to Anthropic format
  let systemPrompt = "";
  const anthropicMessages: any[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt += (systemPrompt ? "\n" : "") + msg.content;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const body: any = {
    model,
    messages: anthropicMessages,
    max_tokens: options.max_tokens || 1024,
  };
  if (systemPrompt) body.system = systemPrompt;
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.stop) body.stop_sequences = Array.isArray(options.stop) ? options.stop : [options.stop];

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json() as any;

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
async function callGoogleProvider(
  mapping: ModelMapping,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stream?: boolean; stop?: string | string[] }
): Promise<ProviderCallResult> {
  const { model, apiKey } = mapping;
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI format to Gemini format
  const contents: any[] = [];
  let systemInstruction: any = null;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  const body: any = {
    contents,
    generationConfig: {
      maxOutputTokens: options.max_tokens || 1024,
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (options.temperature !== undefined) body.generationConfig.temperature = options.temperature;
  if (options.stop) body.generationConfig.stopSequences = Array.isArray(options.stop) ? options.stop : [options.stop];

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json() as any;

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
async function callLocalProvider(
  mapping: ModelMapping,
  messages: ChatMessage[],
  maxTokens: number
): Promise<ProviderCallResult> {
  const { model, baseUrl, providerId } = mapping;

  // Ollama uses /api/chat
  if (providerId === "ollama") {
    const ollamaUrl = (baseUrl || "http://127.0.0.1:11434/api/chat").replace("/api/generate", "/api/chat");
    if (!isValidUrl(ollamaUrl) && !ollamaUrl.startsWith("http://127.0.0.1") && !ollamaUrl.startsWith("http://localhost")) {
      throw new Error('Invalid Ollama URL: ' + ollamaUrl);
    }
    const resp = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options: { num_predict: maxTokens } }),
    });
    const data = await resp.json() as any;
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
  const data = await resp.json() as any;

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
export async function streamProviderResponse(
  res: http.ServerResponse,
  mapping: ModelMapping,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stop?: string | string[] },
  requestId: string
): Promise<void> {
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
  const body: any = { model, messages, max_tokens: maxTokens, stream: true };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.stop) body.stop = options.stop;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Provider-specific header setup
  if (providerId === "anthropic") {
    headers["x-api-key"] = apiKey || "";
    headers["anthropic-version"] = "2023-06-01";
    // Anthropic streaming format is different but we handle it below
  } else if (providerId === "google") {
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
    } catch (err: any) {
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
  } else if (apiKey) {
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
    if (!isValidUrl(streamUrl) && !streamUrl.startsWith("http://127.0.0.1") && !streamUrl.startsWith("http://localhost")) {
      throw new Error('Invalid stream URL: ' + streamUrl);
    }
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
          ? (data.content?.map((c: any) => c.text).join("") || "")
          : (data.choices?.[0]?.message?.content || text);
        const chunk = {
          id: requestId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, delta: { content }, finish_reason: null }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } catch {
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
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE lines from the upstream provider
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(":")) continue;

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
            const normalizedChunk: any = {
              id: requestId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: parsed.model || model,
              choices: [],
            };

            // OpenAI/Groq/Cerebras format
            if (parsed.choices?.[0]?.delta) {
              normalizedChunk.choices = parsed.choices;
            } else if (parsed.choices?.[0]?.text) {
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
            } else if (parsed.type === "message_stop") {
              normalizedChunk.choices = [{ index: 0, delta: {}, finish_reason: "stop" }];
            }
            // Ollama streaming format
            else if (parsed.message?.content) {
              normalizedChunk.choices = [{
                index: 0,
                delta: { content: parsed.message.content },
                finish_reason: parsed.done ? "stop" : null,
              }];
            } else {
              // Unknown format — relay as-is with our ID
              normalizedChunk.choices = [{
                index: 0,
                delta: { content: JSON.stringify(parsed) },
                finish_reason: null,
              }];
            }

            res.write(`data: ${JSON.stringify(normalizedChunk)}\n\n`);
          } catch {
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
  } catch (err: any) {
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
export async function callWithFallback(
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number; stream?: boolean; stop?: string | string[] },
  prompt: string
): Promise<{ result: ProviderCallResult; mapping: ModelMapping }> {
  const mapping = resolveModel(model, prompt);
  if (!mapping) {
    throw new Error(`No provider available for model "${model}". Check your API keys and provider configuration.`);
  }

  // Try primary
  try {
    const result = await callProvider(mapping, messages, options);
    return { result, mapping };
  } catch (primaryError: any) {
    console.error(`[a3m-proxy] Primary provider ${mapping.providerId} failed: ${primaryError.message}`);
  }

  // Try fallback providers
  const available = getAvailableProviders();
  for (const [providerId, provider] of Object.entries(available)) {
    if (providerId === mapping.providerId) continue;
    if (provider.type !== "api") continue;
    if (!provider.apiKey) continue;
    if (!provider.models || provider.models.length === 0) continue;

    const fallbackMapping: ModelMapping = {
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
    } catch (fallbackError: any) {
      console.error(`[a3m-proxy] Fallback provider ${providerId} failed: ${fallbackError.message}`);
    }
  }

  throw new Error(`All providers failed for model "${model}". Check your API keys.`);
}

// ============================================================
// SERVER CREATION
// ============================================================

/**
 * Create and start the A3M Router proxy server.
 *
 * Uses a route table pattern (router.ts) for pluggable endpoint registration.
 * To add a new endpoint:
 *   1. Create src/server/handlers/yourHandler.ts
 *   2. Import and register: registerRoute('GET', /^\/path$/, handleYourPath);
 *
 * @param port - Port to listen on (default: 8787, env: PORT)
 * @returns The http.Server instance
 */
export function createProxyServer(port?: number): http.Server {
  const listenPort = port || parseInt(process.env.PORT || '8787', 10);

  // ── Register all routes ────────────────────────────────────────────────
  // Routes are matched in registration order.
  // Adding a new endpoint = add 1 import + 1 registerRoute() call.
  registerRoute('POST', /^\/v1\/chat\/completions$/, handleChatCompletions, 'POST /v1/chat/completions');
  registerRoute('POST', /^\/v1\/completions$/, handleCompletions, 'POST /v1/completions');
  registerRoute('POST', /^\/v1\/embeddings$/, handleEmbeddings, 'POST /v1/embeddings');
  registerRoute('GET', /^\/v1\/models$/, handleModels, 'GET /v1/models');
  registerRoute('GET', /^\/health$/, handleHealth, 'GET /health');
  registerRoute('GET', /^\/metrics$/, handleMetrics, 'GET /metrics');

  // ── Create request handler ─────────────────────────────────────────────
  const requestHandler = createRequestHandler();

  const server = http.createServer(async (req, res) => {
    try {
      await requestHandler(req, res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[a3m-router] Unhandled error: ${message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: { message, type: 'server_error' } }));
      }
    }
  });

  server.listen(listenPort, () => {
    console.log('');
    console.log('  A3M Router Proxy Server');
    console.log('  ─────────────────────────────────────────');
    console.log(`  Listening:  http://localhost:${listenPort}`);
    console.log('  Endpoints:');
    console.log('    POST /v1/chat/completions  (OpenAI chat)');
    console.log('    POST /v1/completions       (OpenAI completions)');
    console.log('    POST /v1/embeddings       (OpenAI embeddings)');
    console.log('    GET  /v1/models            (List models)');
    console.log('    GET  /health              (Health check)');
    console.log('    GET  /metrics             (Prometheus metrics)');
    console.log('');
    console.log('  Example:');
    console.log("    curl http://localhost:" + listenPort + "/v1/chat/completions \\'");
    console.log('      -H "Content-Type: application/json" \'');
    console.log("      -d '{\"model\":\"auto\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'");
    console.log('');
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[a3m-router] Port ${listenPort} is already in use. Use --port or PORT env var.`);
      process.exit(1);
    } else {
      console.error(`[a3m-router] Server error: ${err.message}`);
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[a3m-router] Shutting down...');
    server.close(() => {
      console.log('[a3m-router] Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[a3m-router] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}
// ============================================================
// EXPORTS
// ============================================================

// Re-export shared state and types for backward compatibility
export { costTracker, requestLogs } from './state';
export type { RequestLog } from './state';
export default createProxyServer;
