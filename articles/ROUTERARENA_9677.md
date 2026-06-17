# A3M Router Hits 96.77% on RouterArena at $0.0768/1K

A3M Router is an open-source adaptive multi-model router for Node.js that routes each request across 47+ LLM providers using cost, latency, confidence, provider health, semantic cache, and task-tier signals.

The latest official RouterArena submission is now live as [PR #144](https://github.com/RouteWorks/RouterArena/pull/144).

## Official RouterArena result

RouterArena evaluated the A3M submission on the full 8,400-query split and reported:

| Metric | Result |
|---|---:|
| RouterArena Score | **0.9404** |
| Accuracy | **96.77%** |
| Avg cost / 1K queries | **$0.0768** |
| Robustness | **1.0000** |
| Abnormal entries | **0** |

The submission also includes a robustness split with a perfect **1.0000** robustness score.

## What changed

Earlier A3M entries were heuristic-only. This submission adds a small research path for cost-aware routing experiments, including:

- Monte Carlo Tree Search routing experiments for quality/cost trade-offs.
- Real provider integration scaffolding for OpenAI-compatible, OpenRouter, Anthropic, Groq, MiniMax, and Ollama providers.
- RouterArena prediction generation and official evaluation workflow.
- LiveCodeBench answer generation using OpenRouter free models, with only locally validated code answers committed as fenced Python blocks.

The key point: A3M is not trying to become a giant chat model. It is a routing layer that helps applications choose the cheapest capable model without adding GPU training or a heavy ML dependency.

## Why this matters

LLM routing is usually framed as a simple fallback chain:

1. Try the cheapest model.
2. If it fails, try the next one.
3. Keep escalating until something answers.

That is cheap, but it is reactive. A better router should infer the task type before calling a model, estimate the required quality tier, check provider health, respect budget, and use cached answers when possible.

A3M's approach is:

- **Parallel multi-LLM execution** for high-value or ambiguous tasks.
- **Cost-aware routing** for budget-sensitive applications.
- **Semantic cache** to avoid repeated provider calls.
- **Provider health and circuit breakers** to avoid degraded endpoints.
- **OpenAI-compatible API** so existing apps can use it as a drop-in gateway.
- **No ML training requirement** for the core router.

## Install

```bash
npm install adaptive-memory-multi-model-router
```

Or run directly:

```bash
npx a3m-router route "Explain quantum computing in one paragraph"
```

## Links

- GitHub: https://github.com/Das-rebel/a3m-router
- npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- RouterArena PR #144: https://github.com/RouteWorks/RouterArena/pull/144

## What is next

The next milestones are:

1. Keep RouterArena PR #144 clean and respond to maintainer feedback.
2. Improve the remaining LiveCodeBench tasks only when locally validated answers are safe.
3. Convert benchmark proof into broader distribution through awesome-lists, benchmark repos, and developer posts.
4. Keep npm version cadence stable and avoid noisy auto-publishing.

A3M's goal is simple: make multi-model applications cheaper, faster, and more reliable without forcing every team to build their own routing infrastructure.
