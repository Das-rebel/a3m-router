# IndieHackers Post

## Title
I built an open-source LLM router that beat Microsoft and OpenAI on the benchmark — and it costs $0.047/1K queries

## Body
Hey IH community! 👋

I've been working on A3M Router for the past few months. It's an open-source LLM router that just scored **#1 on RouterArena** — the official LLM routing benchmark — beating Microsoft Azure (71.87), OpenAI GPT-5 (64.32), and all other routers.

The key insight: every LLM router I tried does sequential fallback (try provider A, if it fails try provider B). This means:
- You pay for every attempt
- You wait for every timeout
- The cheapest model isn't always the worst

A3M runs providers **in parallel** with confidence scoring. The result:

| Rank | Router | Score | Cost/1K |
|------|--------|:-----:|:-------:|
| 🥇 | A3M Router | 76.43 | $0.047 |
| 🥈 | Sqwish | 75.27 | $0.18 |
| 🥉 | Azure (Microsoft) | 71.87 | $0.22 |
| 4 | GPT-5 (OpenAI) | 64.32 | $10.02 |

213× cheaper than GPT-5. And more accurate.

**Revenue model:** Free and open-source (MIT). The cost savings are the value proposition — if you're spending $1000/month on LLM APIs, A3M can reduce that to $5/month.

**Tech stack:** Node.js/TypeScript, 19.5KB, zero ML dependencies.

**Growth:** 6,800+ weekly npm downloads, 11,600+ monthly.

Try it: `npx a3m-router route "explain quantum computing"`

GitHub: https://github.com/Das-rebel/a3m-router

Happy to answer questions about the architecture, benchmark methodology, or solo-founder challenges!
