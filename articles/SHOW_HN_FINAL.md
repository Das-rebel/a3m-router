Title: Show HN: A3M Router — Open-source LLM router that runs 47 providers in parallel

I spent months building routers that call providers one-by-one (try provider A, fail → try B, fail → try C). The latency was terrible and the cost unpredictable.

Then I realized: why not call them all at once and pick the best response?

That's A3M Router. It runs multiple LLM providers **in parallel** and scores each response by confidence. The result:

| Rank | Router | Score | Cost/1K |
|------|--------|:-----:|:-------:|
| 🥇 | **A3M Router** | **76.43** | **$0.047** |
| 🥈 | Sqwish | 75.27 | $0.18 |
| 🥉 | Azure (Microsoft) | 71.87 | $0.22 |
| 4 | GPT-5 (OpenAI) | 64.32 | $10.02 |
| 5 | RouteLLM (Berkeley) | 48.07 | $0.27 |

#1 on RouterArena (arXiv:2510.00202), independently evaluated across 8,400 queries and 9 domains.

**How is it 213× cheaper than GPT-5?**

Sequential fallback goes: expensive model → cheap model → cheapest model. You pay for every call. A3M runs them in parallel, scores by confidence, and returns the best — often the cheapest model gives the best answer.

**Install and try in 5 seconds:**

    npx a3m-router route "Explain quantum computing"

    → routed to: groq/llama-3.3-70b  
    → cost: $0.00003  
    → latency: 138ms

**Other features:**
- Ensemble voting (run N providers, pick best)
- Semantic cache (30%+ hit rate)
- Budget enforcement (set per-query cost limits)
- Circuit breaker (auto failover)
- Episodic memory (context across sessions)
- Query-type presets (fast / creative / deep / code)

It's 19.5KB with zero ML dependencies. Works with OpenAI, Anthropic, Groq, DeepSeek, NVIDIA, Together, OpenRouter, Gemini, Mistral, Cohere, and 40+ more.

GitHub: https://github.com/Das-rebel/a3m-router  
Benchmark: https://das-rebel.github.io/a3m-router/benchmark  
npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router

Happy to answer questions about the routing algorithm, benchmark methodology, or anything else.
