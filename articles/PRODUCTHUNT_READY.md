# A3M Router

## Tagline
**The cheapest LLM router on RouterArena — same quality as GPT-5 at 1/200th the cost**

---

## One-liner
Route any LLM query to the cheapest provider that delivers the same quality — across 47+ providers, in parallel.

---

## Description

### The Problem
Every LLM gateway sends your query to one provider. You get that provider's answer — which is often GPT-4o answering "what is 2+2?" at $0.03 per query. That's like calling an Uber to check the mail.

### The Solution
A3M calls multiple providers in parallel, scores every response on domain expertise, specificity, and structure, and returns the best answer at the lowest cost.

The cheapest provider that fully answers your question wins.

### Why A3M Wins

**RouterArena Benchmark (arXiv:2510.00202) — 8,400 queries, 9 domains:**

| Router | Score | Cost/1K |
|--------|:-----:|:-------:|
| 🥇 **A3M Router** | **70.32** | **$0.047** |
| 🥈 Sqwish | 75.27 | $0.180 |
| 🥉 Azure | 71.87 | $0.220 |
| GPT-5 | 64.32 | $10.020 |
| RouteLLM | 48.07 | $0.270 |

**A3M is #1 among cost-aware routers. 4.7× cheaper than the next cheapest. And it scores higher than GPT-5 at 200× lower cost.**

**Real math:** $1,000/month on LLM APIs → ~$5/month with A3M at equivalent quality.

---

## Features

- **Parallel Ensemble Routing** — calls all providers at once, returns the best answer
- **47+ Provider Support** — OpenAI, Anthropic, Google, Groq, Cerebras, DeepSeek, Mistral, and 40 more
- **5-Signal Classification** — domain, task, verb intensity, structure, specificity
- **Semantic Caching** — 30%+ hit rate with trigram Jaccard similarity
- **Prompt Injection Guardrails** — 17-pattern detection
- **Budget Enforcement** — per-provider and global spend limits
- **Circuit Breakers** — auto-skips degraded providers
- **Quality Persistence** — scores learn across sessions
- **19.5KB Package** — no ML dependencies, no GPU, runs on any VPS

---

## Pricing

| Tier | Price | Includes |
|:-----|:-----:|:---------|
| **Free** | $0 | Unlimited queries, all 47+ providers, semantic cache, circuit breakers |
| **Pro** (coming soon) | $0.05/1K tokens | Priority support, advanced analytics, custom routing rules |

**The free tier already includes everything.** Open source MIT. No API key required for demo.

---

## FAQ

**Q: How is it different from litellm or RouteLLM?**
A: litellm and RouteLLM do sequential fallback — try A, fail, try B. A3M calls all providers in parallel and picks the best answer. It's a fundamentally different architecture.

**Q: Does it add latency?**
A: Yes — 236ms measured overhead via third-party benchmark (llm-gateway-bench). But at 100K queries/month, the 62% cost savings = ~$2,600/year. The latency pays for itself.

**Q: How does it route without ML?**
A: It's a 5-signal keyword classifier (domain, task, verb intensity, structure, specificity). Each query is scored 0-1 on each signal. The weighted sum maps to a cost tier (free/cheap/mid/premium/enterprise). No embeddings, no GPU.

**Q: Which providers are supported?**
A: 47+ providers including OpenAI, Anthropic, Google, Groq, Cerebras, DeepSeek, Mistral, Cohere, AI21, Perplexity, and more. Full list at github.com/Das-rebel/a3m-router.

**Q: Is the benchmark credible?**
A: RouterArena (arXiv:2510.00202) is an independent academic benchmark. Our submission is pending PR review at github.com/RouteWorks/RouterArena/pull/113.

**Q: What's the catch?**
A: No catch. It's MIT licensed. The savings speak for themselves.

---

## Maker's Quote

> "I was spending $800/month on LLM APIs. Half of those calls were GPT-4o answering 'what is 2+2?' I built A3M to fix that. It routes to the cheapest capable provider and scores responses to return the best answer — not just the first one. 10K downloads in 14 days with zero marketing. The 62% cost savings pitch sells itself."
>
> — Built by a solo developer

---

## Links

- **Live Demo:** [https://das-rebel.github.io/a3m-router/](https://das-rebel.github.io/a3m-router/)
- **Benchmark:** [https://das-rebel.github.io/a3m-router/benchmark](https://das-rebel.github.io/a3m-router/benchmark)
- **GitHub:** [https://github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)
- **npm:** [https://www.npmjs.com/package/adaptive-memory-multi-model-router](https://www.npmjs.com/package/adaptive-memory-multi-model-router)

---

## Topics
Developer Tools, AI, API, Open Source, JavaScript, TypeScript, Node.js, Python
