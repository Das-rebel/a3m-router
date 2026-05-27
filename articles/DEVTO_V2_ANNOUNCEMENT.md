---
title: "A3M Router v2.0: Now an OpenAI-Compatible AI Gateway with 39 Providers 🚀"
published: true
description: "Drop-in OpenAI proxy, LangChain adapter, guardrails, semantic cache, cost analytics, and 39 LLM providers — all in one npm package"
tags: node, javascript, ai, webdev
canonical_url: https://github.com/Das-rebel/a3m-router
---

We just shipped A3M Router v2.0.0 — the biggest update since launch.

**What started as a simple routing library is now a full AI Gateway.**

## What's New

### 1. OpenAI-Compatible Proxy Server

```bash
npx a3m-router serve
```

That's it. You now have an OpenAI-compatible API proxy running on `localhost:8787`.

```python
# Drop-in replacement — just change the base URL
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="not-needed"  # A3M Router handles provider keys
)

response = client.chat.completions.create(
    model="auto",  # Intelligent routing
    messages=[{"role": "user", "content": "Hello"}]
)
```

**Any OpenAI SDK works without code changes.** Python, Node, LangChain, LlamaIndex — just point `base_url` to A3M Router.

### 2. Real-Time Dashboard

```
http://localhost:8787/
```

Live dashboard showing:
- Request volume and costs
- Provider status (online/offline)
- Request log with routing decisions
- Cost breakdown by provider

### 3. LangChain Adapter

```javascript
import { A3MChatModel } from 'adaptive-memory-multi-model-router/langchain';

const model = new A3MChatModel({ modelName: 'auto' });
const response = await model.invoke([new HumanMessage("Hello")]);
```

Drop-in replacement for `ChatOpenAI`. Supports streaming, tool calling, and structured output.

### 4. Guardrails Engine

```javascript
import { GuardrailEngine } from 'adaptive-memory-multi-model-router';

const guardrail = new GuardrailEngine({
  promptInjection: true,
  piiDetection: true,
  contentFilter: true
});

const result = await guardrail.checkInput(userInput);
if (result.blocked) {
  // Prompt injection or PII detected
  console.log(result.reason);
}
```

Built-in detection for:
- Prompt injection attempts
- PII (emails, phones, SSNs, credit cards, API keys)
- Harmful content
- Language detection for routing

### 5. Semantic Cache

```javascript
import { SemanticCache } from 'adaptive-memory-multi-model-router';

const cache = new SemanticCache({ similarityThreshold: 0.92 });

// First query: miss, calls provider
const result1 = await cache.get("What is Python?");

// Semantically similar: HIT (no API call!)
const result2 = await cache.get("Tell me about Python");
```

Catches semantically similar queries using n-gram similarity. No embedding API needed.

### 6. Cost Analytics

```javascript
import { CostAnalytics } from 'adaptive-memory-multi-model-router';

const analytics = new CostAnalytics();
analytics.record({ provider: 'groq', cost: 0.001, latency: 420 });

const savings = analytics.getSavings('openai');
// Total saved: $X, XX% cheaper, projected monthly savings: $Y
```

### 7. 39 Providers (was 12)

New providers added:
- **Local**: Ollama, LM Studio, vLLM
- **Cheap/Fast**: DeepInfra, Together AI, Fireworks, Anyscale, Novita, SambaNova
- **Mid-tier**: Cohere, Perplexity, AI21
- **Asian**: DeepSeek, Moonshot, Qwen, Zhipu, Yi
- **Enterprise**: Azure OpenAI, AWS Bedrock, Google Vertex

## Quick Start

```bash
# Install
npm install adaptive-memory-multi-model-router

# Start the gateway
npx a3m-router serve

# Or use as a library
node -e "const { createA3MRouter } = require('adaptive-memory-multi-model-router'); ..."
```

## The Numbers

| Metric | v1.9.5 | v2.0.0 |
|--------|--------|--------|
| Providers | 12 | 39 |
| Exports | 13 | 17 |
| Proxy server | ❌ | ✅ |
| Dashboard | ❌ | ✅ |
| LangChain | ❌ | ✅ |
| Guardrails | Basic | Full engine |
| Semantic cache | ❌ | ✅ |
| Cost analytics | Basic | Full analytics |

## Links

- **GitHub**: https://github.com/Das-rebel/a3m-router
- **NPM**: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- **872+ weekly downloads**

MIT license. Open source. No vendor lock-in.

---

*Built because I was tired of marketing claims. Sharing the data so you don't have to benchmark yourself.*
