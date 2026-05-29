Title: Show HN: A3M Router – Open-source LLM router that runs providers in parallel instead of sequential fallback

I kept watching my LLM router try provider after provider, failing each time, paying for each attempt. The whole "try model A, fail, try model B" pattern felt wrong.

So I built a router that calls multiple providers at the same time and picks the best response by confidence score. Turns out this beats every other approach on the RouterArena benchmark:

    A3M Router:   76.43   ($0.047/1K)
    Sqwish:        75.27   ($0.18/1K)
    Azure:         71.87   ($0.22/1K)
    GPT-5:         64.32   ($10.02/1K)
    RouteLLM:      48.07   ($0.27/1K)

The benchmark (RouterArena, arXiv:2510.00202) evaluated 19 routers on 8,400 queries across 9 domains. Our PR is still open for review: https://github.com/RouteWorks/RouterArena/pull/113

Why it's cheaper: sequential fallback means you pay for every attempt. Running in parallel means you get the best answer in one round-trip, often from the cheapest model.

Why it scores higher: confidence scoring on each response catches when a cheap model produces a better answer than an expensive one. Which happens more often than you'd think.

Try it:

    npx a3m-router route "Explain quantum computing"

Architecture: it's 19.5KB, no ML dependencies, no GPU needed. You point it at API keys and it routes. 47 providers supported (OpenAI, Anthropic, Groq, DeepSeek, NVIDIA, Together, etc.).

Other things it does:
- Ensemble voting (run N, pick best)
- Semantic cache (30%+ hit rate on repeated queries)
- Budget enforcement (cap cost per query)
- Circuit breaker (skip failing providers)
- Memory across sessions (only router that does this)

I'm happy to answer questions about the routing algorithm, the confidence scoring approach, or why parallel execution doesn't actually cost more.

GitHub: https://github.com/Das-rebel/a3m-router
Benchmark details: https://das-rebel.github.io/a3m-router/benchmark
Live demo: https://das-rebel.github.io/a3m-router/
