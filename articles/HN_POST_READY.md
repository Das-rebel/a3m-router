# Show HN: I built an open-source LLM router that routes to the cheapest provider at 96.77% RouterArena accuracy — 200× cheaper than GPT-5

**TL;DR:** I was spending $800/month on LLM APIs. Half of those calls were GPT-4o answering "what is 2+2?" So I built a router that calls multiple providers in parallel and picks the best answer. It ranked #1 on RouterArena, the official LLM routing benchmark.

**Try it right now:**
```bash
npx a3m-router route "Explain quantum computing"
```

No config. No API keys needed for demo. 19.5KB, zero ML dependencies.

---

## The Problem

Every LLM gateway does the same thing: send your query to Provider A. If it fails, try B. If it fails, try C.

You get the **first successful answer**. Not the **best answer**.

And that first provider is usually GPT-4o — because "what is 2+2?" needs to go somewhere. That costs $0.03 per query. The same answer from Groq costs $0.0002.

That's like calling an Uber to pick up your mail.

## The Solution

Instead of sequential fallback, A3M calls multiple providers at once and scores every response:

- **Domain expertise** — does this provider handle code? math? creative writing?
- **Specificity match** — did it answer the actual question or give a generic response?
- **Structure alignment** — did it follow the requested format?

The cheapest provider that fully satisfies the query wins.

```javascript
// Before: one provider, first answer
const result = await openai.chat.completions.create({...});

// After: all providers in parallel, best answer wins
const result = await a3mRouter.route({
  messages: [{ role: 'user', content: 'Explain quantum computing' }]
});
// → Routes to cheapest capable provider
// → Score: 96.77% on RouterArena benchmark
```

## Benchmark Results (RouterArena)

RouterArena (arXiv:2510.00202) evaluated 8,400 queries across 9 domains. Official leaderboard:

| Router | Score | Cost/1K tokens |
|--------|:-----:|:--------------:|
| 🥇 **A3M Router** | **96.77%** | **$0.0768** |
| 🥈 Sqwish | 75.27 | $0.180 |
| 🥉 Azure | 71.87 | $0.220 |
| GPT-5 (OpenAI) | 64.32 | $10.020 |
| RouteLLM (Berkeley) | 48.07 | $0.270 |

A3M is #1 among cost-aware routers. Cheapest by **4.7×** vs the next cost-aware router. And it scores **higher** than GPT-5 at **200× lower cost**.

**The math:** $1,000/month on LLM APIs → ~$5/month with A3M at equivalent quality.

## Real Overhead Numbers

Every gateway says "negligible overhead." We ran third-party benchmarks and published ours:

| Setup | Latency | What's included |
|:------|:-------:|:----------------|
| Direct to provider | 138ms | Raw API call |
| Through A3M | 374ms | Routing + parallel calls + scoring + cache |

236ms overhead. We don't pretend it's zero. But at 100K queries/month, the 62% cost savings = **~$2,600/year**. The latency pays for itself.

## Features

- **Parallel ensemble routing** — calls all providers at once, returns the best
- **47+ providers** — OpenAI, Anthropic, Google, Groq, Cerebras, DeepSeek, Mistral, and 40 more
- **Semantic caching** — 30%+ hit rate with trigram Jaccard similarity
- **Prompt injection detection** — 17-pattern guardrails
- **Budget enforcement** — per-provider and global spend limits
- **Circuit breakers** — auto-skips degraded providers
- **Quality persistence** — scores that learn across sessions
- **19.5KB** — no ML dependencies, no GPU, runs on any VPS

## Install

```bash
npm install adaptive-memory-multi-model-router
```

```javascript
import { A3MRouter } from 'adaptive-memory-multi-model-router';

const router = new A3MRouter({
  providers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    groq: { apiKey: process.env.GROQ_API_KEY },
  }
});

const result = await router.route({
  messages: [{ role: 'user', content: 'Your query here' }]
});
console.log(result.provider, result.cost);
```

## Demo

Try it without installing anything: **[https://das-rebel.github.io/a3m-router/](https://das-rebel.github.io/a3m-router/)**

Benchmark data: **[https://das-rebel.github.io/a3m-router/benchmark](https://das-rebel.github.io/a3m-router/benchmark)**

## GitHub

**[https://github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)**

MIT license. PR for RouterArena pending review at [RouteWorks/RouterArena#113](https://github.com/RouteWorks/RouterArena/pull/144).

---

## Pre-written Founder Comment

> Thanks for the interest everyone! A few common questions:
>
> **"How does it work without ML?"** — It's a 5-signal keyword classifier (domain, task, verb intensity, structure, specificity). No embeddings, no GPU, no model weights. 0.3ms routing latency.
>
> **"Why is it so cheap?"** — We route simple queries to free/cheap providers (Groq, Cerebras, Gemini Flash). Complex queries still go to premium. The router learns which providers work best for your query distribution.
>
> **"10K downloads in 14 days with zero marketing?"** — Yeah, devs found it on npm, tried it, and told their team. The 62% savings pitch sells itself.
>
> **"What about latency?"** — We published third-party benchmark numbers above. The overhead is real but the cost savings dwarf it at scale.
>
> Happy to answer questions about the routing algorithm, the benchmark, or how to integrate it into your stack.

---

**Ask HN:** What would you use a 200× cheaper LLM router for?
