# A3M Router 🔀

**Intelligent LLM routing with adaptive memory — 99.5% accuracy, zero ML, zero GPU.**

Drop-in OpenAI-compatible proxy. Routes queries across 40 providers (Groq, Cerebras, Ollama, DeepSeek, Mistral, OpenAI, Anthropic). Available as TypeScript SDK, Python SDK, CLI, and REST API.

### Three Things No Other Router Does Together

| 🧠 Adaptive Memory | 🎯 Multi-Signal Routing | 🛡️ Built-in Protections |
|:---|:---|:---|
| Learns from your usage patterns over time. Remembers which models work best for your queries. Gets smarter without retraining. | Domain detection (legal, medical, finance, security), complexity scoring, action verb intensity, qualifier analysis, multi-step detection — all without a single ML model. | Semantic cache (skip duplicate LLM calls), security guardrails (PII, prompt injection), cost analytics (track spend across 40 providers), circuit breaker (auto-failover). |

[![npm version](https://badge.fury.io/js/adaptive-memory-multi-model-router.svg)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm downloads](https://img.shields.io/npm/dw/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![GitHub stars](https://img.shields.io/github/stars/Das-rebel/adaptive-memory-multi-model-router)](https://github.com/Das-rebel/adaptive-memory-multi-model-router)

---

## Quick Start

```bash
npm install adaptive-memory-multi-model-router   # TypeScript/Node
pip install a3m-router                            # Python
npx a3m-router serve                              # Proxy at localhost:8787
```

### TypeScript

```typescript
import { A3MRouter } from 'adaptive-memory-multi-model-router/sdk';

const router = new A3MRouter();
const decision = router.route("Write a Python function to sort an array");
// → { model: "groq/llama-3.3-70b", tier: "cheap", cost: 0.0004, complexity: 0.33 }
```

### Python

```python
from a3m import A3MRouter

async with A3MRouter() as router:
    decision = await router.route("Write a Python function to sort an array")
    print(decision.model, decision.tier, decision.cost)
    # → groq/llama-3.3-70b cheap 0.0004
```

### OpenAI-Compatible Proxy

```bash
npx a3m-router serve
# Point any OpenAI SDK at http://localhost:8787/v1
```

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")
response = client.chat.completions.create(model="auto",
    messages=[{"role": "user", "content": "Hello!"}])
```

### CLI

```bash
npx a3m-router route "Your query here"     # Route a single query
npx a3m-router benchmark                    # Run accuracy benchmark
npx a3m-router serve --port 3000            # Start proxy
npx a3m-router health                       # Check provider status
npx a3m-router cost                         # Cost analytics
```

### REST API

```bash
curl -X POST http://localhost:8787/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query": "What is 2+2?"}'

curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'
```

---

## Benchmark

200 queries, 4 cost tiers (free / cheap / mid / premium). Same methodology as [RouteLLM](https://arxiv.org/abs/2404.06035).

| Metric | A3M Router v3 | RouteLLM (BERT) |
|--------|:-------------:|:---------------:|
| **±1 tier accuracy** | **99.5%** | ~85% [1] |
| Exact tier match | 64.5% | Not published |
| Cost savings vs all-premium | 61.6% | ~60-70% [1] |
| GPU required | No | Yes |
| Model download | 0 KB | 500MB+ |
| Package size | 19.5 KB gzipped | 1.5GB+ |
| Startup time | <100ms | ~2s |

[1] RouteLLM scores from arXiv:2404.06035, measured on MT-Bench (different benchmark). Our scores on 200-query self-benchmark. Same methodology, not directly comparable.

```
               routed →    free    cheap    mid    premium
actual free (50)             46       4       0       0
actual medium (60)           11      47       2       0
actual complex (50)           0      24      18       8
actual expert (40)            0       1      21      18
```

Free recall: 92%. Cheap recall: 78%. Expert domain detection: 45%.

Run it yourself: `node scripts/routing-benchmark-v2.js`

---

## Cost Savings

Real provider pricing. 10,000 queries/month. [RouteLLM paper](https://arxiv.org/abs/2404.06035) shows ~47% of queries are simple.

| Query Type | % Traffic | GPT-4o Only | A3M Routes To | A3M Cost | Savings |
|-----------|:---------:|:-----------:|:-------------:|:--------:|:-------:|
| Simple Q&A | 47% | $4.94 | CommandCode (free) | $0.00 | 100% |
| Code gen | 15% | $4.88 | DeepSeek v3 ($0.14/1M) | $0.17 | 97% |
| Summarization | 18% | $7.20 | GPT-4o-mini ($0.15/1M) | $0.43 | 94% |
| Reasoning | 12% | $8.70 | Claude Haiku ($0.80/1M) | $3.36 | 61% |
| Expert | 8% | $8.40 | GPT-4o ($2.50/1M) | $8.40 | 0% |
| **Total** | **100%** | **$34.11** | — | **$12.36** | **64%** |

| Monthly Queries | GPT-4o Only | A3M Router | You Save | Annualized |
|:---------------:|:-----------:|:----------:|:--------:|:----------:|
| 10K | $34 | $12 | $22 | $261 |
| 100K | $341 | $124 | $218 | $2,610 |
| 1M | $3,411 | $1,236 | $2,175 | $26,100 |

---

## Comparison

| Feature | A3M Router | [LiteLLM](https://github.com/BerriAI/litellm) | [Portkey](https://github.com/Portkey-AI/gateway) | [RouteLLM](https://github.com/lm-sys/RouteLLM) | [OpenRouter](https://openrouter.ai) |
|---------|:----------:|:-------:|:-------:|:-------:|:-------:|
| Routing accuracy published | **Yes** | No | No | Yes | No |
| Routing method | Multi-signal | Manual | Manual | BERT/ML | Manual |
| Zero-config proxy | Yes | No | No | No | API-only |
| Adaptive memory | Yes | No | No | No | No |
| Semantic cache | Yes | Yes | Yes | No | No |
| Guardrails | Yes | Yes | Yes | No | No |
| Cost analytics | Yes | Yes | Yes | No | Yes |
| TypeScript SDK | Yes | No | Yes | No | Yes |
| Python SDK | Yes | Yes | Yes | Yes | Yes |
| CLI | Yes | Yes | No | No | No |
| REST API | Yes | Yes | Yes | No | Yes |
| Self-hosted | Yes | Yes | Yes | Yes | No |
| No GPU required | Yes | Yes | Yes | **No** | Yes |
| Package size | 19.5 KB gzip | ~50MB | ~30MB | ~1.5GB | API |
| License | MIT | Custom | MIT | Apache 2.0 | Proprietary |

Also watch: [9router](https://github.com/decolua/9router), [ClawRouter](https://github.com/BlockRunAI/ClawRouter), [Plano](https://github.com/katanemo/plano), [Helicone](https://github.com/Helicone/helicone)

---

## 40 Providers

| Tier | Providers | Cost/1M tokens |
|------|-----------|:--------------:|
| Free | CommandCode, Ollama, LM Studio, vLLM, LocalAI | $0.00 |
| Fast | Groq, Cerebras | ~$0.60 |
| Balanced | Mistral, DeepSeek, Qwen, GLM-4, MiniMax | $1.50-$2.00 |
| Premium | OpenAI, Anthropic, Google | $2.50-$30.00 |

One line of config to add a provider. Failover is automatic.

---

## When NOT to Use This

- You only use one provider
- Your workload is >80% expert-level queries
- You need 250+ provider integrations (use [Portkey](https://github.com/Portkey-AI/gateway))
- You are building a prototype with <100 queries/day

---

## Links

- [npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- [GitHub](https://github.com/Das-rebel/adaptive-memory-multi-model-router)
- [API Reference](docs/API.md)
- [Playground](https://codesandbox.io/p/sandbox/github/Das-rebel/adaptive-memory-multi-model-router/tree/main/playground)
- [Discussions](https://github.com/Das-rebel/adaptive-memory-multi-model-router/discussions)

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [good first issues](https://github.com/Das-rebel/adaptive-memory-multi-model-router/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

MIT License. No vendor lock-in. No account required. `npm install` and go.
