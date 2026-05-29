# ProductHunt Listing

## Tagline (60 chars max)
Cheapest LLM router, ranked #1 on the official benchmark

## One-liner
Route any query to the cheapest capable model across 47+ providers — and it's #1 on RouterArena.

## Description
Every LLM router calls providers one-by-one until one works. A3M calls them all at once and picks the best answer. Result: **#1 on RouterArena** (76.43 score) and **213× cheaper than GPT-5** at $0.047 per 1K queries.

**Why it matters:** If you're spending $1,000/month on LLM APIs, A3M can get you the same or better results for under $5.

**Try it right now:**
```
npx a3m-router route "Explain quantum computing"
```

No config needed — detects your API keys automatically.

**How it works:**
1. You send a query
2. A3M calls multiple providers in parallel (OpenAI, Anthropic, Groq, DeepSeek, NVIDIA, etc.)
3. Each response gets a confidence score
4. The highest-confidence response wins
5. You get the best answer at the lowest cost

**What makes it different:**
- 🔀 **Parallel execution** — no fallback chain, just one round-trip
- 🧠 **Episodic memory** — remembers context across sessions (only router that does this)
- 💰 **Budget enforcement** — cap cost per query, never overspend
- 🔄 **Circuit breaker** — automatically skips failing providers
- ⚡ **19.5KB** — zero ML dependencies, no GPU, MIT license

**Links:**
GitHub: https://github.com/Das-rebel/a3m-router
Demo: https://das-rebel.github.io/a3m-router/
Benchmark: https://das-rebel.github.io/a3m-router/benchmark

## Topics
Productivity, Developer Tools, Open Source, Artificial Intelligence

## Gallery images needed (CRITICAL — prioritize these):
1. 📊 **Cost comparison chart** (dark theme, A3M bar barely visible vs GPT-5 massive bar)
2. ⚡ **Parallel vs Sequential diagram** (side-by-side: old way = 3 arrows sequentially, new way = 3 arrows in parallel)
3. 🖥️ **Terminal demo** (dark terminal showing `npx a3m-router route "explain quantum"` → result)
4. 📈 **RouterArena leaderboard** (screenshot from the PR, showing #1 ranking)
5. 💾 **Memory example** (showing how the router remembers context)

## First comment (maker comment):
Hey ProductHunt 👋

I built A3M Router because I was frustrated with how every LLM router works: try the expensive model first, fail, try the next one, fail again. You pay for every attempt and wait for every timeout.

The insight was simple: if you call all providers at once and score each response, you get the best answer faster AND cheaper. The cheapest model often produces the best answer — you just need a good scoring function to know when.

We just got evaluated on RouterArena (the official LLM routing benchmark) and scored #1 out of 19 routers, beating Microsoft Azure and OpenAI GPT-5. At $0.047/1K queries, it's also the cheapest router on the leaderboard.

Try it: `npx a3m-router route "your query"` — takes 5 seconds, no config needed.

Happy to answer any questions!
