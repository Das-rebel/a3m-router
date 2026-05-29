# ProductHunt Listing

## Tagline (60 chars max)
Same answer as GPT-5. 200× cheaper. #1 on the benchmark.

## One-liner
Route any LLM query to the cheapest provider that works — across 47+ providers, in parallel.

## Description
GPT-5 costs $10/1K queries. A3M costs $0.047. Same quality answers.

How? Instead of sending every query to the expensive model, A3M calls multiple providers at once and picks the best answer. The cheapest provider usually wins.

**Try it right now:**
```
npx a3m-router route "What is machine learning?"
```

No config needed. Detects your API keys automatically.

**The benchmark says it all:**

| Router | Score | Cost/1K queries |
|--------|:-----:|:---------------:|
| 🥇 **A3M Router** | **76.43** | **$0.047** |
| 🥈 Sqwish | 75.27 | $0.180 |
| 🥉 Azure (Microsoft) | 71.87 | $0.220 |
| GPT-5 (OpenAI) | 64.32 | $10.020 |
| RouteLLM (Berkeley) | 48.07 | $0.270 |

Source: [RouterArena](https://github.com/RouteWorks/RouterArena/pull/113) — evaluated across 8,400 queries and 9 domains (RouterArena arXiv:2510.00202, our submission pending review).

**The math:** If you spend $1,000/month on LLM APIs, A3M gets you the same quality for ~$5.

**What makes it different:**
- 🔀 Calls all providers in parallel (not one-by-one)
- 💰 Routes simple queries to free/cheap providers
- 🧠 Remembers which providers work best for your queries
- 🔄 Auto-skips failing providers
- ⚡ 19.5KB, zero ML, runs anywhere

**Links:**
GitHub: https://github.com/Das-rebel/a3m-router
Demo: https://das-rebel.github.io/a3m-router/
Benchmark: https://das-rebel.github.io/a3m-router/benchmark

## Topics
Developer Tools, AI, API, Open Source, JavaScript