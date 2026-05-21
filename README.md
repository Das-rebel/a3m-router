[🇨🇳 中文](./README_zh.md) · [🇯🇵 日本語](./README_ja.md) · [English](./README.md)

# A3M Router

[![npm](https://img.shields.io/npm/dt/adaptive-memory-multi-model-router?label=npm)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm](https://img.shields.io/npm/v/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![Tests](https://img.shields.io/badge/tests-55%2F55%20passing-brightgreen)](test.js)
[![License](https://img.shields.io/github/license/Das-rebel/adaptive-memory-multi-model-router)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Das-rebel/adaptive-memory-multi-model-router)](https://github.com/Das-rebel/adaptive-memory-multi-model-router)
[![Discord](https://img.shields.io/badge/Discord-Join-brightgreen?logo=discord)](https://discord.gg/a3m-router)
[![Docs](https://img.shields.io/badge/Docs-API-blue?logo=read-the-docs)](docs/API.md)

[Documentation](docs/API.md) · [GitHub](https://github.com/Das-rebel/adaptive-memory-multi-model-router) · [npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router)

---

## What is A3M Router?

**Intelligent LLM routing with adaptive memory** — routes every query to the cheapest capable model across 36+ providers. 99.5% ±1 tier accuracy. Zero ML weights. Zero GPU. Starts in <100ms.

A3M Router is an OpenAI-compatible proxy that uses multi-signal heuristic routing to classify query complexity and automatically select the most cost-effective provider.

## Install

```bash
npm install adaptive-memory-multi-model-router   # TypeScript / Node
pip install a3m-router                            # Python
npx a3m-router serve                              # Start proxy: localhost:8787
```

## Quick Start

### TypeScript

```typescript
import { A3MRouter } from 'adaptive-memory-multi-model-router';

const router = new A3MRouter();

// Auto-route to cheapest capable model
const result = await router.route("Write a Python quicksort");
// → { model: "groq/llama-3.3-70b", tier: "cheap", cost: 0.0004 }

// OpenAI-compatible API
const response = await router.chat({
  model: "auto",
  messages: [{ role: "user", content: "Hello" }]
});
```

### Python

```python
from a3m import A3MRouter

async with A3MRouter() as router:
    decision = await router.route("Analyze this contract")
    print(decision.model, decision.tier, decision.cost)
    # → anthropic/claude-3.5-sonnet premium 0.008
```

### CLI

```bash
npx a3m-router route "Explain quantum computing"   # Get routing decision
npx a3m-router serve --port 8787                  # Start proxy
npx a3m-router benchmark                          # Run accuracy test
```

### REST API

```bash
curl http://localhost:8787/v1/route -d '{"query": "Write code"}'
curl http://localhost:8787/v1/chat/completions \
  -d '{"model": "auto", "messages": [{"role": "user", "content": "Hi"}]}'
```

## How It Works

```
Query → Guardrails (<1ms) → Cache (<1ms) → Classify (2ms) → Route
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                                  FREE           CHEAP           PREMIUM
                               Groq, etc.      Llama, Mistral   GPT-4o, Claude
```

**Routing signals:** Domain + Task type + Query structure → Tier → Cheapest available

## Features

| | |
|---|---|
| **Adaptive Memory** | Learns from usage. EMA quality scoring. No retraining. |
| **Multi-Signal Routing** | 12 signals across 5 dimensions. Zero ML weights. |
| **Semantic Cache** | Trigram Jaccard similarity. 30% hit rate. |
| **Guardrails** | 17-pattern injection detection. PII redaction. |
| **Circuit Breaker** | 3 failures → 60s cooldown. Auto failover. |
| **Cost Analytics** | Per-provider spend. Budget alerts. Savings tracking. |
| **OpenAI-Compatible** | Drop-in for any OpenAI SDK. |

## Benchmark

**200-query test set, May 2026:**

| Metric | Value |
|--------|-------|
| ±1 Tier Accuracy | 99.5% |
| Free Tier Recall | 92% |
| Expert Recall | 45% |
| Savings vs GPT-4o | 61.6% |

Run: `node scripts/routing-benchmark-v2.js`

## Providers (36+)

| Tier | Score | Examples |
|------|-------|----------|
| **FREE** | <0.20 | Groq (LLaMA 3.3 70B), DeepSeek Chat, Fireworks |
| **CHEAP** | 0.20-0.45 | Mistral 7B, Qwen 2.5, Yi Large, DeepSeek Coder |
| **MID** | 0.45-0.65 | Claude 3 Haiku, GPT-4o-mini, Gemini Pro |
| **PREMIUM** | >0.65 | Claude 3.5 Sonnet, GPT-4o, Gemini Ultra |

**Chinese providers:** Kimi (Moonshot), Zhipu GLM, Qwen, Yi, Baichuan, StepFun

## Comparison

| | A3M Router | LiteLLM | Portkey |
|--|:--:|:--:|:--:|
| Auto Routing | ✓ | Manual | Manual |
| Semantic Cache | ✓ 30% | — | Limited |
| Guardrails | ✓ 17 patterns | — | Limited |
| Circuit Breaker | ✓ | — | — |
| Package Size | 19.5 KB | ~50 MB | ~30 MB |
| Startup | <100ms | ~500ms | ~300ms |

## When NOT to Use

- Only one LLM provider → routing overhead not worth it
- >80% expert queries → just use GPT-4o directly
- 250+ provider integrations → [Portkey](https://github.com/Portkey-AI/gateway)
- ML-based routing (BERT) → [RouteLLM](https://github.com/Surfsol/RouteLLM)

## Links

- [Documentation](docs/API.md)
- [npm package](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- [GitHub repo](https://github.com/Das-rebel/adaptive-memory-multi-model-router)
- [Contributing](CONTRIBUTING.md)

MIT License. `npm install` and go.
