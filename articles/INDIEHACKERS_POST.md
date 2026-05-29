# IndieHackers Post

## Title
I built an open-source LLM router that beat Microsoft and OpenAI on the benchmark — and it costs $0.047/1K queries

## Body
Hey IH! 👋

Solo developer here. I've been building LLM-powered apps for the past year and kept running into the same problem: every time I call an LLM API, I'm guessing which provider to use. Too expensive? Too slow? Wrong model for this query?

So I built A3M Router — and it just scored **#1 on RouterArena** (the official LLM routing benchmark), beating Microsoft Azure and OpenAI GPT-5.

**The numbers:**

| Router | Score | Cost/1K |
|--------|:-----:|:-------:|
| A3M Router | **76.43** | **$0.047** |
| Sqwish | 75.27 | $0.18 |
| Azure (Microsoft) | 71.87 | $0.22 |
| GPT-5 (OpenAI) | 64.32 | $10.02 |
| RouteLLM (Berkeley) | 48.07 | $0.27 |

**The insight:** Every router I tried does sequential fallback — try the expensive model, fail, try the cheap one. You pay for every attempt. A3M calls them all at once and picks the best answer by confidence. Often the cheapest provider gives the best answer.

**Business model:** Open-source (MIT). The value is the cost savings — if you're spending $1,000/month on LLM APIs, A3M can get you the same quality for under $5/month.

**Growth so far:**
- 6,800+ weekly npm downloads (growing 10× in 2 weeks)
- 35 PRs submitted to awesome lists (300K+ star exposure)
- #1 on RouterArena

**Tech stack:** Node.js/TypeScript, 19.5KB, zero ML dependencies.

Try it: `npx a3m-router route "your query"`

GitHub: https://github.com/Das-rebel/a3m-router

Would love your feedback — especially on the business model. Is open-source + cost savings enough, or should I offer a hosted version?
