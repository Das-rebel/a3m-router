# A3M Router API Reference

Complete reference for the A3M Router — TypeScript SDK, Python SDK, CLI, REST API, and integrations.

---

## Table of Contents

- [TypeScript SDK](#typescript-sdk)
- [Python SDK](#python-sdk)
- [CLI](#cli)
- [REST API](#rest-api)
- [OpenAI SDK Compatibility](#openai-sdk-compatibility)
- [LangChain Integration](#langchain-integration)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

---

## TypeScript SDK

### Installation

```bash
npm install adaptive-memory-multi-model-router
```

### Import

```typescript
import { A3MRouter } from 'adaptive-memory-multi-model-router/sdk';
```

### Constructor

```typescript
const router = new A3MRouter(config?: A3MRouterConfig);
```

**A3MRouterConfig:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultModel` | `string` | — | Fallback model when routing is ambiguous |
| `maxCostPerQuery` | `number` | — | Max cost per query in USD |
| `preferSpeedOverQuality` | `boolean` | `false` | Prefer fast models over higher quality |
| `providers` | `string[]` | all | Restrict routing to these provider IDs |

### Methods

#### `route(query: string): RoutingResult`

Route a query to the best available model. Returns the decision without executing the query.

```typescript
const decision = router.route("Write a Python function to sort a list");

console.log(decision.model);          // "groq/llama-3.3-70b-versatile"
console.log(decision.tier);           // "cheap"
console.log(decision.cost);           // 0.00035
console.log(decision.complexity);     // 0.35
console.log(decision.reasoning);      // "Selected Groq/llama-3.3-70b for code detected"
console.log(decision.fallbackModels); // ["cerebras/llama-3.3-70b", "mistral/mistral-small"]
console.log(decision.isFree);         // false
console.log(decision.isExpert);       // false
```

**RoutingResult:**

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Selected model identifier |
| `tier` | `'free' \| 'cheap' \| 'mid' \| 'premium'` | Cost tier |
| `cost` | `number` | Estimated cost in USD |
| `complexity` | `number` | Query complexity score (0.0–1.0) |
| `reasoning` | `string` | Human-readable routing reason |
| `fallbackModels` | `string[]` | Alternative models in priority order |
| `isFree` | `boolean` | Whether the selected model is free |
| `isExpert` | `boolean` | Whether this is an expert-level query |

#### `routeBatch(queries: string[]): RoutingResult[]`

Route multiple queries at once.

```typescript
const decisions = router.routeBatch([
  "What is 2+2?",
  "Design a distributed database",
  "Translate to French"
]);

decisions.forEach((d, i) => {
  console.log(`Query ${i}: ${d.model} ($${d.cost.toFixed(6)})`);
});
```

#### `recommend(task: string): RoutingResult`

Get model recommendation for a task category.

```typescript
const rec = router.recommend("code generation");
console.log(rec.model); // "deepseek/deepseek-chat"
```

#### `analyze(query: string): QueryFeatures`

Extract detailed features from a query for debugging.

```typescript
const features = router.analyze("Design a secure authentication system for a healthcare app");

console.log(features.complexity);       // 0.72
console.log(features.has_code);         // false
console.log(features.requires_reasoning); // true
console.log(features.is_security);      // true
console.log(features.detected_domain);  // "security"
console.log(features.domain_score);     // 0.30
```

**QueryFeatures:**

| Field | Type | Description |
|-------|------|-------------|
| `complexity` | `number` | Overall complexity score (0.0–1.0) |
| `length` | `number` | Word count |
| `has_code` | `boolean` | Code-related keywords detected |
| `has_math` | `boolean` | Math-related keywords detected |
| `is_multilingual` | `boolean` | Non-ASCII characters detected |
| `is_translation` | `boolean` | Translation request detected |
| `is_creative` | `boolean` | Creative writing request |
| `requires_reasoning` | `boolean` | Analytical/reasoning verbs detected |
| `is_security` | `boolean` | Security domain keywords |
| `is_devops` | `boolean` | DevOps/infrastructure keywords |
| `is_data` | `boolean` | Data/ML keywords |
| `detected_domain` | `string` | Best matching domain (legal, medical, finance, security, architecture, ml_research) |
| `domain_score` | `number` | Domain match confidence |

#### `serve(port?: number): Promise<string>`

Start the OpenAI-compatible proxy server.

```typescript
const proxyURL = await router.serve(8787);
console.log(proxyURL); // "http://localhost:8787/v1"

// Now use with any OpenAI SDK
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: proxyURL, apiKey: 'not-needed' });
```

#### `proxyURL` (getter)

Returns the proxy URL. Available after `serve()` is called, otherwise returns the default.

```typescript
router.serve(3000);
console.log(router.proxyURL); // "http://localhost:3000/v1"
```

### Tier Classification

Complexity scores map to tiers:

| Tier | Complexity Range | Typical Models | Cost/1M tokens |
|------|:----------------:|----------------|:--------------:|
| `free` | 0.00 – 0.19 | CommandCode, Ollama, LM Studio | $0.00 |
| `cheap` | 0.20 – 0.44 | Groq Llama, Cerebras, DeepSeek | ~$0.60 |
| `mid` | 0.45 – 0.64 | Mistral Small, GPT-4o-mini | ~$1.50 |
| `premium` | 0.65 – 1.00 | GPT-4o, Claude Sonnet, Gemini Pro | $2.50+ |

### Low-Level API

The SDK wraps these lower-level exports, also available directly:

```typescript
import {
  routeQuery,
  routeBatch,
  recommendForTask,
  extractQueryFeatures,
  createA3MRouter,
  getAvailableProviders,
  registerProvider,
  createProxyServer,
} from 'adaptive-memory-multi-model-router';

// Direct routing
const result = routeQuery("What is 2+2?");
// => { primary_model, fallback_models, confidence, reasoning, estimated_cost, ... }

// Router instance (v1 style)
const router = createA3MRouter();
const decision = router.route("Hello");
```

---

## Python SDK

### Installation

```bash
pip install a3m-router
```

### Usage

```python
from a3m import A3MRouter

# Create router instance
router = A3MRouter()

# Route a query
decision = router.route("Write a Python function")
print(decision.model)     # "groq/llama-3.3-70b"
print(decision.tier)      # "cheap"
print(decision.cost)      # 0.0004
print(decision.complexity) # 0.35

# Chat through the router (auto-selects model)
response = router.chat("What is 2+2?")
print(response.content)   # "4"
print(response.model)     # "groq/llama-3.3-70b"

# Analyze query features
features = router.analyze("Design a microservice architecture")
print(features.complexity)  # 0.58
print(features.has_code)    # False
print(features.detected_domain) # "architecture"
```

### Async Usage

```python
import asyncio
from a3m import A3MRouter

async def main():
    router = A3MRouter()
    
    # Async chat
    response = await router.achat("Explain quantum computing")
    print(response.content)
    
    # Batch routing
    decisions = router.route_batch([
        "What is 2+2?",
        "Design a distributed system",
        "Write a poem"
    ])
    for d in decisions:
        print(f"{d.model} ({d.tier}) — ${d.cost:.6f}")

asyncio.run(main())
```

### With OpenAI Python SDK

```python
from openai import OpenAI

# Point OpenAI SDK at the A3M proxy
client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

---

## CLI

### Installation

```bash
npm install -g adaptive-memory-multi-model-router
# or use without installing:
npx a3m-router <command>
```

### Commands

#### `route` — Route a query

```bash
npx a3m-router route "Your query here"
```

Output:
```
  Primary:   groq/llama-3.3-70b-versatile
  Fallbacks: cerebras/llama-3.3-70b, mistral/mistral-small
  Est. Cost: $0.000350
  Type:      api
  Reason:    Selected Groq for code detected, fast tier
```

#### `serve` — Start proxy server

```bash
npx a3m-router serve --port 8787
```

Options:
- `--port` / `-p` — Port to listen on (default: 8787)

#### `benchmark` — Run routing accuracy benchmark

```bash
npx a3m-router benchmark
```

#### `providers` — List configured providers

```bash
npx a3m-router providers
```

#### `models` — List known models

```bash
npx a3m-router models
```

#### `recommend` — Get model recommendation for a task

```bash
npx a3m-router recommend "code generation"
```

#### `cost` — Estimate token cost

```bash
npx a3m-router cost "Your text here"
```

#### `token` — Count tokens

```bash
npx a3m-router token "Your text here"
```

#### `batch` — Route multiple queries

```bash
npx a3m-router batch "What is 2+2?" "Design a system" "Write a poem"
```

#### `compare` — Compare providers side by side

```bash
npx a3m-router compare "Your query"
```

#### `test` — Test all configured providers

```bash
npx a3m-router test
```

#### `memory` — Memory operations

```bash
npx a3m-router memory add "key" "value"
npx a3m-router memory search "query"
npx a3m-router memory stats
```

#### `status` — Show router status

```bash
npx a3m-router status
```

---

## REST API

Start the server:

```bash
npx a3m-router serve --port 8787
```

Base URL: `http://localhost:8787`

### POST /v1/chat/completions

OpenAI-compatible chat endpoint. Supports both streaming and non-streaming.

**Request:**

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is 2+2?"}
    ],
    "temperature": 0.7,
    "max_tokens": 1024,
    "stream": false
  }'
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | `string` | `"auto"` | Model to use. `"auto"` triggers routing. Accepts `provider/model` format. |
| `messages` | `array` | required | OpenAI-format message array |
| `temperature` | `number` | provider default | Sampling temperature (0–2) |
| `max_tokens` | `number` | `1024` | Maximum tokens to generate |
| `stream` | `boolean` | `false` | Enable SSE streaming |
| `stop` | `string \| string[]` | — | Stop sequences |

**Non-streaming response:**

```json
{
  "id": "chatcmpl-a1b2c3d4",
  "object": "chat.completion",
  "created": 1716000000,
  "model": "llama-3.3-70b-versatile",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "2 + 2 = 4"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 5,
    "total_tokens": 29
  }
}
```

**Streaming response:**

```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{"content":"2"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{"content":" +"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{"content":" 2 = 4"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Model routing:**

| Model value | Behavior |
|-------------|----------|
| `"auto"` | Routes based on query complexity (recommended) |
| `"groq/llama-3.3-70b-versatile"` | Uses specific provider/model |
| `"gpt-4o"` | Maps to configured OpenAI provider |
| `"claude-sonnet"` | Maps to configured Anthropic provider |

### POST /v1/completions

OpenAI-compatible text completions endpoint.

```bash
curl http://localhost:8787/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "prompt": "The capital of France is",
    "max_tokens": 50
  }'
```

**Response:**

```json
{
  "id": "chatcmpl-...",
  "object": "text_completion",
  "created": 1716000000,
  "model": "llama-3.3-70b-versatile",
  "choices": [
    {
      "text": " Paris.",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "completion_tokens": 2,
    "total_tokens": 7
  }
}
```

### POST /v1/route

Route a query without executing it. Returns the routing decision.

```bash
curl -X POST http://localhost:8787/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a Python function to sort a list"}'
```

**Response:**

```json
{
  "primary_model": "groq/llama-3.3-70b-versatile",
  "fallback_models": ["cerebras/llama-3.3-70b", "mistral/mistral-small"],
  "confidence": 0.82,
  "reasoning": "Selected Groq for code detected, fast tier",
  "estimated_cost": 0.00035,
  "estimated_latency_ms": 800,
  "features": {
    "complexity": 0.35,
    "has_code": true,
    "has_math": false,
    "requires_reasoning": false,
    "detected_domain": ""
  }
}
```

### GET /v1/models

List all available models.

```bash
curl http://localhost:8787/v1/models
```

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "groq/llama-3.3-70b-versatile",
      "object": "model",
      "owned_by": "groq"
    }
  ]
}
```

### GET /health

Health check with provider status and cost summary.

```bash
curl http://localhost:8787/health
```

**Response:**

```json
{
  "status": "ok",
  "version": "2.1.0",
  "providers": {
    "total": 12,
    "healthy": 8,
    "details": {
      "groq": {
        "name": "Groq",
        "type": "api",
        "models": 3,
        "available": true
      }
    }
  },
  "cost": {
    "total": 0.0042,
    "requests": 127
  },
  "uptime": 86400.5,
  "recentRequests": []
}
```

### GET /dashboard

Interactive web dashboard (if `public/` directory is present).

```
http://localhost:8787/
```

---

## OpenAI SDK Compatibility

The A3M Router proxy is fully compatible with the OpenAI SDK. Point the `baseURL` at the proxy and use `model: "auto"` for routing.

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8787/v1',
  apiKey: 'not-needed'
});

// Auto-routing
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Specific model
const response2 = await client.chat.completions.create({
  model: 'groq/llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Streaming
const stream = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### cURL

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

---

## LangChain Integration

```typescript
import { A3MChatModel } from 'adaptive-memory-multi-model-router/langchain';
import { HumanMessage } from '@langchain/core/messages';

const model = new A3MChatModel({
  modelName: 'auto', // or specific model
  temperature: 0.7,
});

// Invoke
const response = await model.invoke([
  new HumanMessage("What is 2+2?")
]);
console.log(response.content);

// Streaming
const stream = await model.stream([
  new HumanMessage("Tell me a story")
]);
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

**Prerequisites:**

```bash
npm install @langchain/core @langchain/openai
```

LangChain is a peer dependency — install it separately.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Proxy server port | `8787` |
| `GROQ_API_KEY` | Groq provider API key | — |
| `CEREBRAS_API_KEY` | Cerebras provider API key | — |
| `OPENAI_API_KEY` | OpenAI provider API key | — |
| `ANTHROPIC_API_KEY` | Anthropic provider API key | — |
| `GOOGLE_API_KEY` | Google/Gemini provider API key | — |
| `MISTRAL_API_KEY` | Mistral provider API key | — |
| `DEEPSEEK_API_KEY` | DeepSeek provider API key | — |
| `OPENROUTER_API_KEY` | OpenRouter provider API key | — |

### Config File

Provider configuration is stored at `~/.config/a3m-router/providers.json`:

```json
{
  "providers": {
    "groq": {
      "apiKey": "gsk_...",
      "models": ["llama-3.3-70b-versatile", "mixtral-8x7b"]
    }
  }
}
```

### Programmatic Provider Registration

```typescript
import { registerProvider } from 'adaptive-memory-multi-model-router';

registerProvider('my-provider', {
  name: 'My Provider',
  type: 'api',
  apiKey: 'sk-...',
  baseUrl: 'https://api.my-provider.com/v1/chat/completions',
  models: ['my-model-v1'],
  costPerK: { input: 0.50, output: 1.50 },
  maxTokens: 8192,
  priority: 5,
});
```

---

## Error Handling

### HTTP Error Responses

All errors follow the OpenAI error format:

```json
{
  "error": {
    "message": "No provider available for model \"gpt-4o\". Configure API keys.",
    "type": "server_error",
    "code": 503
  }
}
```

| Status | Type | Description |
|--------|------|-------------|
| 400 | `invalid_request_error` | Malformed request body or missing fields |
| 404 | `not_found` | Unknown endpoint |
| 502 | `upstream_error` | Provider returned an error |
| 503 | `server_error` | No providers available |

### Fallback Behavior

When the primary provider fails, the proxy automatically tries alternative providers in order:

1. Primary provider (routed or specified)
2. Other configured API providers
3. Returns 502 if all providers fail

### SDK Error Handling

```typescript
const router = new A3MRouter();

try {
  const decision = router.route("Your query");
  if (decision.model === 'unknown') {
    // No providers available
  }
} catch (err) {
  console.error('Routing failed:', err);
}
```

---

## Provider Support

### Supported Provider Types

| Type | Providers | Protocol |
|------|-----------|----------|
| **API** | Groq, Cerebras, OpenAI, Anthropic, Google, Mistral, DeepSeek, OpenRouter | REST API |
| **Local** | Ollama, vLLM, LM Studio | OpenAI-compatible local API |
| **CLI** | CommandCode, OpenCode | Local CLI tools |

### Adding Custom Providers

```typescript
import { registerProvider } from 'adaptive-memory-multi-model-router';

registerProvider('custom', {
  name: 'Custom LLM',
  type: 'api',
  apiKey: process.env.CUSTOM_API_KEY,
  baseUrl: 'https://api.custom.com/v1/chat/completions',
  models: ['custom-v1'],
  costPerK: { input: 1.0, output: 2.0 },
  maxTokens: 4096,
  priority: 5,
});
```

---

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────┐
│  Your Code   │────>│  A3M Router                              │
│              │     │                                          │
│  OpenAI SDK  │     │  ┌─────────┐    ┌──────────────────┐   │
│  LangChain   │     │  │ Routing │───>│ Model Selection  │   │
│  Python SDK  │     │  │ Engine  │    │ (cost/quality)   │   │
│  CLI         │     │  └─────────┘    └──────┬───────────┘   │
│  cURL        │     │                        │               │
└──────────────┘     │  ┌─────────────────────▼────────────┐  │
                     │  │  Provider Layer                    │  │
                     │  │  Groq | Cerebras | OpenAI | ...   │  │
                     │  │  Ollama | vLLM | LM Studio        │  │
                     │  └───────────────────────────────────┘  │
                     └──────────────────────────────────────────┘
```
