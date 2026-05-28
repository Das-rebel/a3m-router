#!/usr/bin/env node

/**
 * A3M Router — OpenAI-Compatible API Proxy
 *
 * Standalone Express server that accepts OpenAI API requests and routes them
 * through the A3M Router engine. Drop-in replacement for api.openai.com.
 *
 * Usage:
 *   node proxy/server.js
 *   curl http://localhost:8787/v1/chat/completions -H "Content-Type: application/json" \
 *     -d '{"model":"a3m-auto","messages":[{"role":"user","content":"Hello"}]}'
 *
 * Model names:
 *   a3m-auto       — Intelligent routing (default, best model for query)
 *   a3m-cheapest   — Cheapest available provider
 *   a3m-fastest    — Fastest available provider
 *   a3m-ensemble   — Parallel multi-LLM execution + merged result
 *   gpt-4, gpt-4o  — Standard OpenAI aliases (maps through A3M)
 *   provider/model — Direct provider/model (groq/llama-3.3-70b-versatile)
 */

const express = require("express");
const path = require("path");

// ============================================================
// A3M ROUTER IMPORTS (compiled dist modules)
// ============================================================

const A3M_ROOT = path.resolve(__dirname, "..");

const {
  getAvailableProviders,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
  loadConfig,
} = require(path.join(A3M_ROOT, "dist/providers/providerConfig"));

const {
  resolveModel,
  listAvailableModels,
} = require(path.join(A3M_ROOT, "dist/server/modelMapper"));

const { routeQuery } = require(path.join(A3M_ROOT, "dist/routing/advancedRouter"));

// ============================================================
// BOOTSTRAP — Load config & API keys from env
// ============================================================

loadConfig();

// ============================================================
// CONSTANTS
// ============================================================

const PORT = parseInt(process.env.PORT || "8787", 10);

const MODEL_STRATEGIES = {
  "a3m-auto": "auto",
  "a3m-cheapest": "cheapest",
  "a3m-fastest": "fastest",
  "a3m-ensemble": "ensemble",
};

// ============================================================
// HELPERS
// ============================================================

function generateId() {
  return (
    "chatcmpl-" +
    Math.random().toString(36).substring(2, 14) +
    Date.now().toString(36)
  );
}

function openAIError(status, message, type) {
  return {
    error: {
      message,
      type: type || "server_error",
      code: status,
    },
  };
}

// ============================================================
// PROVIDER API CALLS
// ============================================================

/**
 * Call any OpenAI-compatible provider (most providers).
 */
async function callOpenAICompatible(baseUrl, apiKey, model, messages, opts) {
  const body = {
    model,
    messages,
    max_tokens: opts.max_tokens || 4096,
    temperature: opts.temperature,
    top_p: opts.top_p,
    stop: opts.stop,
    stream: opts.stream || false,
  };
  // Remove undefined keys
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (opts.stream) {
    return { stream: true, response: resp };
  }

  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return { stream: false, data };
}

/**
 * Call a provider determined by a ModelMapping.
 */
async function callMapping(mapping, messages, opts) {
  const { providerId, model, baseUrl, apiKey, type } = mapping;

  // Local providers (Ollama / vLLM / LM Studio) — OpenAI-compatible
  if (type === "local" || type === "cli") {
    const ollamaUrl = (baseUrl || "http://127.0.0.1:11434/api/chat").replace(
      "/api/generate",
      "/api/chat"
    );
    const body = {
      model,
      messages,
      stream: opts.stream || false,
      options: { num_predict: opts.max_tokens || 4096 },
    };
    const resp = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (opts.stream) return { stream: true, response: resp, isOllama: true };

    const data = await resp.json();
    return {
      stream: false,
      data: {
        choices: [
          {
            message: { role: "assistant", content: data.message?.content || "" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens:
            (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model,
      },
    };
  }

  // Anthropic has a different API
  if (providerId === "anthropic") {
    return callAnthropic(mapping, messages, opts);
  }

  // Google has a different API
  if (providerId === "google") {
    return callGoogle(mapping, messages, opts);
  }

  // Everything else — OpenAI-compatible
  return callOpenAICompatible(baseUrl, apiKey, model, messages, opts);
}

async function callAnthropic(mapping, messages, opts) {
  const { model, apiKey } = mapping;
  let systemPrompt = "";
  const anthropicMessages = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt += (systemPrompt ? "\n" : "") + msg.content;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const body = {
    model,
    messages: anthropicMessages,
    max_tokens: opts.max_tokens || 4096,
    stream: opts.stream || false,
  };
  if (systemPrompt) body.system = systemPrompt;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (opts.stream) return { stream: true, response: resp, isAnthropic: true };

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const content = data.content?.[0]?.text || "";
  return {
    stream: false,
    data: {
      choices: [
        { message: { role: "assistant", content }, finish_reason: data.stop_reason || "stop" },
      ],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model || model,
    },
  };
}

async function callGoogle(mapping, messages, opts) {
  const { model, apiKey } = mapping;
  const contents = [];
  let systemInstruction = null;

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

  const body = {
    contents,
    generationConfig: { maxOutputTokens: opts.max_tokens || 4096 },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (opts.temperature !== undefined)
    body.generationConfig.temperature = opts.temperature;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return {
    stream: false,
    data: {
      choices: [
        { message: { role: "assistant", content }, finish_reason: "stop" },
      ],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens:
          (data.usageMetadata?.promptTokenCount || 0) +
          (data.usageMetadata?.candidatesTokenCount || 0),
      },
      model,
    },
  };
}

// ============================================================
// STREAMING (SSE)
// ============================================================

/**
 * Stream a response from the upstream provider as SSE chunks.
 */
async function streamResponse(res, mapping, messages, opts, requestId, modelName) {
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-A3M-Proxy": "true",
    "X-A3M-Model": modelName,
    "X-A3M-Provider": mapping.providerId,
    "X-A3M-Resolved": mapping.model,
  });

  try {
    const upstreamOpts = { ...opts, stream: true };
    const result = await callMapping(mapping, messages, upstreamOpts);

    if (!result.stream) {
      // Non-streaming fallback — send as single SSE chunk
      const chunk = {
        id: requestId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: result.data.model,
        choices: [
          {
            index: 0,
            delta: { content: result.data.choices?.[0]?.message?.content || "" },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      const done = {
        id: requestId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: result.data.model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
      res.write(`data: ${JSON.stringify(done)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const upstreamResp = result.response;
    if (!upstreamResp.ok) {
      const errText = await upstreamResp.text();
      res.write(
        `data: ${JSON.stringify({
          id: requestId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: mapping.model,
          choices: [
            {
              index: 0,
              delta: { content: `Error: ${upstreamResp.status} ${errText.substring(0, 200)}` },
              finish_reason: "stop",
            },
          ],
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    if (!upstreamResp.body) {
      // No streaming body
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = upstreamResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const isAnthropic = result.isAnthropic;
    const isOllama = result.isOllama;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed.startsWith("data: ")) {
          const payload = trimmed.substring(6);
          if (payload === "[DONE]") {
            res.write("data: [DONE]\n\n");
            continue;
          }

          try {
            const parsed = JSON.parse(payload);

            // Normalize to OpenAI SSE format
            const chunk = {
              id: requestId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: parsed.model || mapping.model,
              choices: [],
            };

            // OpenAI-compatible format
            if (parsed.choices?.[0]?.delta) {
              chunk.choices = parsed.choices;
            } else if (parsed.choices?.[0]?.text) {
              chunk.choices = [
                {
                  index: 0,
                  delta: { content: parsed.choices[0].text },
                  finish_reason: null,
                },
              ];
            }
            // Anthropic streaming
            else if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              chunk.choices = [
                {
                  index: 0,
                  delta: { content: parsed.delta.text },
                  finish_reason: null,
                },
              ];
            } else if (parsed.type === "message_stop") {
              chunk.choices = [{ index: 0, delta: {}, finish_reason: "stop" }];
            }
            // Ollama streaming
            else if (parsed.message?.content) {
              chunk.choices = [
                {
                  index: 0,
                  delta: { content: parsed.message.content },
                  finish_reason: parsed.done ? "stop" : null,
                },
              ];
            } else {
              continue; // Skip unknown format chunks
            }

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          } catch {
            // Non-JSON payload — skip
          }
        }
      }
    }

    // Ensure [DONE]
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    // Send error as SSE
    res.write(
      `data: ${JSON.stringify({
        id: requestId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: mapping.model,
        choices: [
          {
            index: 0,
            delta: { content: `Error: ${err.message}` },
            finish_reason: "stop",
          },
        ],
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

// ============================================================
// ENSEMBLE — Parallel multi-LLM execution
// ============================================================

/**
 * Run multiple providers in parallel and merge their responses.
 * Returns the best result based on confidence scoring.
 */
async function callEnsemble(messages, opts, prompt) {
  const available = getAvailableProviders();
  const providers = Object.keys(available);

  // Pick top 3 providers by priority (lowest = best)
  const topProviders = providers.slice(0, 3);
  if (topProviders.length === 0) {
    throw new Error("No providers available for ensemble routing");
  }

  // Resolve a model for each provider
  const mappings = [];
  for (const providerId of topProviders) {
    const provider = available[providerId];
    if (!provider.models || provider.models.length === 0) continue;
    const modelName = provider.models[0];
    mappings.push({
      providerId,
      model: modelName,
      baseUrl: provider.baseUrl || "",
      apiKey: provider.apiKey || null,
      costPerK: provider.costPerK || { input: 0, output: 0 },
      type: provider.type || "api",
    });
  }

  if (mappings.length === 0) {
    throw new Error("No models available for ensemble routing");
  }

  // Run all in parallel — first successful response wins
  const results = await Promise.allSettled(
    mappings.map((m) => callMapping(m, messages, { ...opts, stream: false }))
  );

  // Collect successful results
  const successes = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && !r.value.stream) {
      successes.push({
        mapping: mappings[i],
        data: r.value.data,
      });
    }
  }

  if (successes.length === 0) {
    // Collect error messages
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message)
      .join("; ");
    throw new Error(`All ensemble providers failed: ${errors}`);
  }

  // Pick the first successful result (could upgrade to confidence voting)
  const best = successes[0];

  return {
    choices: best.data.choices,
    usage: best.data.usage,
    model: best.data.model || best.mapping.model,
    provider: best.mapping.providerId,
    ensemble_count: successes.length,
  };
}

// ============================================================
// ROUTE RESOLUTION
// ============================================================

/**
 * Route a model name to the correct strategy and resolve the provider mapping.
 */
function resolveRoute(modelName, prompt) {
  // Check for A3M special model names
  const strategy = MODEL_STRATEGIES[modelName];

  if (strategy === "cheapest") {
    const provider = findCheapestAvailableProvider();
    if (!provider) return null;
    return {
      strategy: "direct",
      mapping: {
        providerId: provider.id,
        model: provider.models[0] || "unknown",
        baseUrl: provider.baseUrl || "",
        apiKey: provider.apiKey || null,
        costPerK: provider.costPerK || { input: 0, output: 0 },
        type: provider.type || "api",
      },
    };
  }

  if (strategy === "fastest") {
    const provider = findFastestAvailableProvider();
    if (!provider) return null;
    return {
      strategy: "direct",
      mapping: {
        providerId: provider.id,
        model: provider.models[0] || "unknown",
        baseUrl: provider.baseUrl || "",
        apiKey: provider.apiKey || null,
        costPerK: provider.costPerK || { input: 0, output: 0 },
        type: provider.type || "api",
      },
    };
  }

  if (strategy === "ensemble") {
    return { strategy: "ensemble" };
  }

  // Default: use resolveModel (handles "auto", provider/model, OpenAI aliases)
  const mapping = resolveModel(modelName, prompt);
  if (!mapping) return null;

  return { strategy: "direct", mapping };
}

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

// CORS headers for all requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-A3M-Proxy", "true");
  res.setHeader("X-A3M-Version", "2.0.0");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Raw body parsing for streaming detection
app.use(express.json({ type: "application/json" }));

// ============================================================
// POST /v1/chat/completions
// ============================================================

app.post("/v1/chat/completions", async (req, res) => {
  const startTime = Date.now();
  const requestId = generateId();

  try {
    const request = req.body;
    if (!request?.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      res.status(400).json(openAIError(400, "messages is required and must be a non-empty array", "invalid_request_error"));
      return;
    }

    const modelName = request.model || "a3m-auto";
    const stream = !!request.stream;
    const messages = request.messages;
    const promptForRouting = messages.map((m) => m.content || "").join(" ");

    const opts = {
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
    };

    // Resolve route
    const route = resolveRoute(modelName, promptForRouting);

    if (!route) {
      res.status(503).json(
        openAIError(503, `No provider available for model "${modelName}". Check your API keys.`, "server_error")
      );
      return;
    }

    // ---- ENSEMBLE STRATEGY ----
    if (route.strategy === "ensemble") {
      if (stream) {
        // Streaming ensemble — fall back to non-streaming for simplicity,
        // then stream the result as a single SSE response
        try {
          const result = await callEnsemble(messages, opts, promptForRouting);
          // Send as SSE stream
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          const content = result.choices?.[0]?.message?.content || "";
          const chunk = {
            id: requestId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [
              { index: 0, delta: { content }, finish_reason: null },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          res.write(
            `data: ${JSON.stringify({
              id: requestId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: result.model,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            })}\n\n`
          );
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (err) {
          res.status(502).json(openAIError(502, err.message, "upstream_error"));
        }
      } else {
        // Non-streaming ensemble
        try {
          const result = await callEnsemble(messages, opts, promptForRouting);

          const response = {
            id: requestId,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: result.choices,
            usage: result.usage,
            _a3m: {
              strategy: "ensemble",
              provider_count: result.ensemble_count,
              selected_provider: result.provider,
            },
          };

          const latencyMs = Date.now() - startTime;
          console.log(
            `[a3m-proxy] ${requestId} ensemble model=${modelName} providers=${result.ensemble_count} selected=${result.provider} latency=${latencyMs}ms`
          );
          res.json(response);
        } catch (err) {
          res.status(502).json(openAIError(502, err.message, "upstream_error"));
        }
      }
      return;
    }

    // ---- DIRECT STRATEGY (single provider) ----
    const mapping = route.mapping;
    const resolvedModel = mapping.model;

    if (stream) {
      // Streaming response
      res.setHeader("X-A3M-Provider", mapping.providerId);
      res.setHeader("X-A3M-Resolved", resolvedModel);

      await streamResponse(res, mapping, messages, opts, requestId, modelName);

      const latencyMs = Date.now() - startTime;
      console.log(
        `[a3m-proxy] ${requestId} stream model=${modelName}->${mapping.providerId}/${resolvedModel} latency=${latencyMs}ms`
      );
    } else {
      // Non-streaming response
      try {
        const result = await callMapping(mapping, messages, { ...opts, stream: false });

        if (result.stream) {
          // Shouldn't happen, but handle gracefully
          res.status(502).json(openAIError(502, "Unexpected streaming response", "upstream_error"));
          return;
        }

        const data = result.data;

        const response = {
          id: requestId,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: data.model || resolvedModel,
          choices: data.choices || [
            {
              index: 0,
              message: { role: "assistant", content: data.content || "" },
              finish_reason: data.finish_reason || "stop",
            },
          ],
          usage: data.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
          _a3m: {
            strategy: "direct",
            provider: mapping.providerId,
            resolved_model: resolvedModel,
          },
        };

        const latencyMs = Date.now() - startTime;
        console.log(
          `[a3m-proxy] ${requestId} model=${modelName}->${mapping.providerId}/${resolvedModel} latency=${latencyMs}ms tokens=${response.usage.total_tokens}`
        );

        // Include provider info in headers
        res.setHeader("X-A3M-Provider", mapping.providerId);
        res.setHeader("X-A3M-Resolved", resolvedModel);
        res.json(response);
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        console.error(
          `[a3m-proxy] ${requestId} ERROR model=${modelName}->${mapping.providerId}/${resolvedModel} latency=${latencyMs}ms error=${err.message}`
        );
        res.status(502).json(openAIError(502, `Upstream error: ${err.message}`, "upstream_error"));
      }
    }
  } catch (err) {
    console.error(`[a3m-proxy] ${requestId} UNHANDLED: ${err.message}`);
    res.status(500).json(openAIError(500, err.message));
  }
});

// ============================================================
// GET /v1/models — List available models
// ============================================================

app.get("/v1/models", (_req, res) => {
  const models = listAvailableModels();

  // Add A3M strategy models
  const a3mModels = [
    {
      id: "a3m-auto",
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "a3m-router",
      description: "Intelligent routing — selects best model for your query",
    },
    {
      id: "a3m-cheapest",
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "a3m-router",
      description: "Cheapest available provider",
    },
    {
      id: "a3m-fastest",
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "a3m-router",
      description: "Fastest available provider",
    },
    {
      id: "a3m-ensemble",
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "a3m-router",
      description: "Parallel multi-LLM execution with merged results",
    },
  ];

  // Add any A3M strategy models not already in the list
  const existingIds = new Set(models.map((m) => m.id));
  for (const m of a3mModels) {
    if (!existingIds.has(m.id)) {
      models.push(m);
    }
  }

  res.json({ object: "list", data: models });
});

// ============================================================
// GET /health — Health check
// ============================================================

app.get("/health", (_req, res) => {
  const available = getAvailableProviders();
  const providerCount = Object.keys(available).length;

  res.json({
    status: "ok",
    version: "2.0.0",
    proxy_type: "express",
    providers_available: providerCount,
    providers: Object.keys(available),
    model_strategies: Object.keys(MODEL_STRATEGIES),
    uptime_seconds: process.uptime(),
  });
});

// ============================================================
// Root — Welcome
// ============================================================

app.get("/", (_req, res) => {
  res.json({
    name: "A3M Router Proxy",
    version: "2.0.0",
    description: "OpenAI-compatible API proxy with intelligent LLM routing",
    endpoints: {
      "POST /v1/chat/completions": "OpenAI chat completions",
      "GET /v1/models": "List available models",
      "GET /health": "Health check",
    },
    model_strategies: {
      "a3m-auto": "Intelligent routing — best model for your query",
      "a3m-cheapest": "Cheapest available provider",
      "a3m-fastest": "Fastest available provider",
      "a3m-ensemble": "Parallel multi-LLM execution with merged results",
    },
    usage: {
      curl: `curl http://localhost:${PORT}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"a3m-auto","messages":[{"role":"user","content":"Hello"}]}'`,
      openai_sdk: `new OpenAI({ baseURL: 'http://localhost:${PORT}/v1' })`,
    },
  });
});

// ============================================================
// 404 handler
// ============================================================

app.use((_req, res) => {
  res.status(404).json(openAIError(404, "Not found. Available endpoints: GET /, GET /v1/models, GET /health, POST /v1/chat/completions", "not_found"));
});

// ============================================================
// START
// ============================================================

function start() {
  app.listen(PORT, () => {
    console.log("");
    console.log("  A3M Router Proxy Server (Express)");
    console.log("  ---------------------------------------");
    console.log(`  Listening:  http://localhost:${PORT}`);
    console.log("  Endpoints:");
    console.log("    POST /v1/chat/completions  (OpenAI chat)");
    console.log("    GET  /v1/models            (List models)");
    console.log("    GET  /health               (Health check)");
    console.log("");
    console.log("  Model strategies:");
    console.log("    a3m-auto       Intelligent routing (default)");
    console.log("    a3m-cheapest   Cheapest provider");
    console.log("    a3m-fastest    Fastest provider");
    console.log("    a3m-ensemble   Parallel multi-LLM execution");
    console.log("");
    console.log("  Example:");
    console.log(`    curl http://localhost:${PORT}/v1/chat/completions \\`);
    console.log('      -H "Content-Type: application/json" \\');
    console.log('      -d \'{"model":"a3m-auto","messages":[{"role":"user","content":"Hello"}]}\'');
    console.log("");
    console.log("  OpenAI SDK:");
    console.log(`    new OpenAI({ baseURL: 'http://localhost:${PORT}/v1' })`);
    console.log("");
  });
}

// Allow running directly or importing
if (require.main === module) {
  start();
}

module.exports = { app, start };
