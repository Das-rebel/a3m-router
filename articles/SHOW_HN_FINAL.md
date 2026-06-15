Title: Show HN: I built an open-source LLM router that costs $0.05/1K queries — same quality as GPT-5 at $10/1K

I was spending $800/month on LLM API calls. Half of them were overkill — GPT-4o for "what is 2+2?" That's like taking a helicopter to buy milk.

So I built a router that calls multiple providers at the same time and picks the best answer. The cheapest provider often wins.

The result: #1 on RouterArena benchmark (arXiv:2510.00202), and the cheapest router on the market.

    A3M Router:   76.43   $0.05/1K
    Sqwish:        75.27   $0.18/1K
    Azure:         71.87   $0.22/1K
    GPT-5:         64.32   $10.02/1K
    RouteLLM:      48.07   $0.27/1K

Try it right now:

    npx a3m-router route "Explain quantum computing"

It detects your API keys automatically. No config needed.

How it works: instead of trying providers one-by-one (expensive, slow), it calls them all at once and picks the best response. Simple idea. Turns out it works — especially for straightforward queries where the cheapest model gives the same answer as the expensive one.

It's 19.5KB. No ML dependencies. No GPU. Runs on any VPS.

Other stuff it does: semantic caching (30%+ hit rate), budget enforcement, circuit breakers, and quality scores that persist across sessions.

The benchmark: RouterArena (arXiv:2510.00202), 8,400 queries, 9 domains. Results: https://github.com/Das-rebel/RouterArena

GitHub: https://github.com/Das-rebel/a3m-router