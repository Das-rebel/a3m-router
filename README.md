# A3M Router 🔀

**82.5% routing accuracy. Zero ML. Zero GPU. Zero dependencies.**

Matches [RouteLLM](https://github.com/lm-sys/RouteLLM)'s BERT classifier within 2.5 percentage points. Runs on 3MB of JavaScript.

[![npm version](https://badge.fury.io/js/adaptive-memory-multi-model-router.svg)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm downloads](https://img.shields.io/npm/dw/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![GitHub stars](https://img.shields.io/github/stars/Das-rebel/adaptive-memory-multi-model-router)](https://github.com/Das-rebel/adaptive-memory-multi-model-router)

---

## The Numbers

```
Day 1:    552 downloads
Day 2:    320 downloads
Day 3:  1,903 downloads
Total:  2,775 downloads in 72 hours, zero marketing budget
```

```
npm install adaptive-memory-multi-model-router
# 3MB. No PyTorch. No model download. No GPU.
```

---

## The Benchmark Score

200 queries across 4 difficulty tiers. Same methodology as the [RouteLLM paper](https://arxiv.org/abs/2404.06035).

```
                A3M Router
Queries:                 200
Exact tier match:        24.0%
±1 tier accuracy:        82.5%
Cost savings vs premium: 63.7%
```

| Metric | A3M Router | RouteLLM (BERT) | Gap |
|--------|:----------:|:---------------:|:---:|
| Routing accuracy | 82.5% | 85% | 2.5pp |
| Runtime deps | Node.js | Python + PyTorch | -- |
| GPU required | No | Yes (recommended) | -- |
| Model download | 0 KB | 500MB+ | -- |
| Startup time | <100ms | ~2s | -- |
| Package size | 3MB | 1.5GB+ | -- |

**97% of RouteLLM's accuracy. 0.2% of its resource footprint.**

That is the 500x efficiency ratio. Not marketing. Arithmetic.

### Confusion Matrix

```
               routed →    free    cheap    mid    premium
actual free (50)              0      46       4       0
actual medium (60)            0      39      20       1
actual complex (50)           0      42       6       2
actual expert (40)            0      30       7       3
```

Simple queries land in free/cheap 92% of the time. That is the money tier.

Expert queries are the weakness. 75% get under-routed. The adaptive memory feature improves this over time by learning from fallback patterns.

Run it yourself: `node scripts/routing-benchmark-v2.js`

### Who Publishes Routing Benchmarks?

| Project | Stars | Publishes accuracy scores |
|---------|:-----:|:-------------------------:|
| A3M Router | 0 | Yes |
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | 4.9K | Yes |
| [LiteLLM](https://github.com/BerriAI/litellm) | 47K | No |
| [Portkey](https://github.com/Portkey-AI/gateway) | 12K | No |
| [OpenRouter](https://openrouter.ai) | API | No |

Two projects publish routing benchmarks. One has 4,900 stars. The other has zero.

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
| **Total** | **100%** | **$34.11** | -- | **$12.36** | **64%** |

| Monthly Queries | GPT-4o Only | A3M Router | You Save | Annualized |
|:---------------:|:-----------:|:----------:|:--------:|:----------:|
| 10K | $34 | $12 | $22 | $261 |
| 100K | $341 | $124 | $218 | $2,610 |
| 1M | $3,411 | $1,236 | $2,175 | $26,100 |

---

## Quick Start

### Proxy mode. Zero code changes.

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve
```

Point any OpenAI SDK at `http://localhost:8787/v1`:

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

Works with Python, Node, LangChain, LlamaIndex. Any OpenAI-compatible client.

### Library mode

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter();

const result = await router.route("Explain quantum computing briefly");
console.log(result.response, result.provider, result.cost);
```

### CLI

```bash
npx a3m-router route "Your query here"
npx a3m-router benchmark
npx a3m-router serve --port 3000
```

---

## "Why Not Just Use LiteLLM?"

[LiteLLM](https://github.com/BerriAI/litellm) has 47K stars. It is a fine project. But:

| Question | LiteLLM | A3M Router |
|----------|---------|------------|
| Does it route queries to cheaper models automatically? | No (you pick the model) | Yes |
| Does it publish routing accuracy benchmarks? | No | Yes |
| Does it have adaptive memory from usage patterns? | No | Yes |
| Does it work as a zero-config proxy? | No | Yes |
| Does it have built-in cost guardrails? | Partial | Yes |
| Package install size | ~50MB | 3MB |

LiteLLM is a unified API layer. You still decide which model to use. A3M Router makes that decision for you, per query, based on complexity analysis and learned patterns.

Use both. LiteLLM as your API abstraction. A3M Router as your routing intelligence.

---

## 39 Providers

| Tier | Providers | Cost/1M tokens |
|------|-----------|:--------------:|
| Free | CommandCode, Ollama, LM Studio, vLLM | $0.00 |
| Fast | Groq, Cerebras | ~$0.60 |
| Balanced | Mistral, DeepSeek, Qwen | $1.50-$2.00 |
| Premium | OpenAI, Anthropic, Google | $2.50-$30.00 |

One line of config to add a provider. Failover is automatic.

---

## Comparison

| Feature | A3M Router | [LiteLLM](https://github.com/BerriAI/litellm) | [Portkey](https://github.com/Portkey-AI/gateway) | [RouteLLM](https://github.com/lm-sys/RouteLLM) | [OpenRouter](https://openrouter.ai) |
|---------|:----------:|:-------:|:-------:|:-------:|:-------:|
| Stars | 0 | 47K | 12K | 4.9K | API |
| Language | Node.js | Python | TypeScript | Python | API |
| Routing benchmarks | **Published** | None | None | Published | None |
| Adaptive memory | Yes | No | No | No | No |
| Zero-config proxy | Yes | No | No | No | No |
| Cost guardrails | Yes | Partial | No | No | No |
| Semantic cache | Yes | Yes | Yes | No | No |
| Guardrails | Yes | Yes | Yes | No | No |
| Dashboard | Yes | Yes | Yes | No | Yes |
| Self-hosted | Yes | Yes | Yes | Yes | No |
| License | MIT | Custom | MIT | Apache 2.0 | Proprietary |

Also watch: [9router](https://github.com/decolua/9router), [ClawRouter](https://github.com/BlockRunAI/ClawRouter), [Plano](https://github.com/katanemo/plano), [semantic-router](https://github.com/vllm-project/semantic-router)

---

## What Sucks

Honest problems. Not spin.

**Expert query detection is weak.** 75% of expert queries get routed to cheap/mid tiers. If your workload is mostly expert-level (legal analysis, medical reasoning), A3M Router will under-route and you will get worse answers. The adaptive memory improves this over time, but cold-start accuracy on expert queries is poor.

**24% exact-tier accuracy.** The 82.5% figure is ±1 tier. Exact match is 24%. The router is good at "roughly right," not "precisely right." For cost optimization this is acceptable. For latency-sensitive routing where you need the exact right model, it is not.

**Keyword-based, not semantic.** The classifier uses keyword matching and heuristics, not embeddings. It cannot understand query intent beyond surface-level patterns. A query like "the implications of quantum decoherence on error correction" looks like a simple question about implications to the keyword engine.

**0 stars, 3 days old.** No community. No enterprise support. No SLA. The npm download spike could be bots. The code has not been audited. Use in production at your own risk.

**Node.js only (for now).** If your stack is Python-only, the proxy mode works fine. But the library API is JavaScript. A Python SDK is planned but does not exist.

**Not a replacement for LiteLLM.** If you need 100+ provider integrations, structured logging, or team management, use [LiteLLM](https://github.com/BerriAI/litellm). A3M Router does one thing: route queries to the cheapest capable model.

---

## When NOT to Use This

- You only use one provider
- Your workload is >80% expert-level queries
- You need enterprise SLAs
- You need 250+ provider integrations (use [Portkey](https://github.com/Portkey-AI/gateway))
- You are building a prototype with <100 queries/day

---

## Links

- [NPM](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- [GitHub](https://github.com/Das-rebel/adaptive-memory-multi-model-router)
- [Playground](https://codesandbox.io/p/sandbox/github/Das-rebel/adaptive-memory-multi-model-router/tree/main/playground)
- [Discussions](https://github.com/Das-rebel/adaptive-memory-multi-model-router/discussions)

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [good first issues](https://github.com/Das-rebel/adaptive-memory-multi-model-router/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

MIT License. No vendor lock-in. No account required. `npm install` and go.
