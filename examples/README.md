# A3M Router Usage Examples

Practical examples showing how to use the **Adaptive Memory Multi-Model Router** in real-world scenarios.

## Prerequisites

```bash
npm install adaptive-memory-multi-model-router
```

Set at least one API key in your environment:

```bash
export OPENAI_API_KEY=sk-...
export GROQ_API_KEY=gsk_...
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=...
```

## Examples

| #  | File                     | Description                                                                 |
|----|--------------------------|-----------------------------------------------------------------------------|
| 1  | `basic-route.js`         | Route a query to the best provider. Shows the routing decision with model, cost, confidence, and reasoning. |
| 2  | `ensemble.js`            | Query multiple providers in parallel and merge results. A3M's signature capability. |
| 3  | `classify-then-route.js` | Classify a query's domain first (code, math, creative, etc.), then route to the optimal provider for that domain. |
| 4  | `chat-loop.js`           | Interactive terminal chat loop with auto-routing, cost tracking, and guardrails. |
| 5  | `cost-compare.js`        | Compare estimated costs across providers for the same prompt. Find the cheapest and fastest routes. |
| 6  | `a3m-sdk.js`             | Use the TypeScript SDK class — `route()`, `analyze()`, `recommend()`, batch routing, and the proxy server. |

## Running Examples

```bash
# Route a query (dry-run — no API call)
node examples/basic-route.js

# Ensemble across multiple providers
node examples/ensemble.js

# Classify then route
node examples/classify-then-route.js

# Interactive chat loop
node examples/chat-loop.js

# Cost comparison
node examples/cost-compare.js

# SDK showcase
node examples/a3m-sdk.js
```

## What Makes A3M Unique

- **Parallel ensemble voting** — query multiple LLMs and compare results (no other router does this)
- **RouteLLM-style routing** — learned cost-quality tradeoff based on arXiv:2404.06035
- **47+ providers** — free, cheap, mid, premium, enterprise tiers
- **Semantic cache** — returns cached responses for semantically similar queries
- **Budget enforcement** — hard caps per API key with monthly reset
- **Guardrails** — prompt injection detection, PII redaction, content filtering
- **LangChain adapter** — drop-in replacement for ChatOpenAI
