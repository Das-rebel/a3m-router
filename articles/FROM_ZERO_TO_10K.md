---
title: "From Zero to 10K Downloads: Building an Open-Source LLM Router in 2 Weeks"
description: "The real story behind building an open-source LLM gateway that hit 10,000 npm downloads in 14 days. Spoiler: it wasn't the code."
tags: ["opensource", "llm", "npm", "indiehackers", "sideproject"]
date: 2026-05-28
canonical_url: https://github.com/Das-rebel/a3m-router
---

> **Ready to publish** — This article targets HackerNoon and IndieHackers audiences. Tone: personal, honest, builder-story. Length: ~1,000 words.

---

# From Zero to 10K Downloads: Building an Open-Source LLM Router in 2 Weeks

I launched an npm package on May 14th. Two weeks later, 10,024 people had downloaded it.

This isn't a "growth hack" post. I didn't post on Product Hunt. I didn't run ads. I didn't have a Twitter following.

What I had was a single insight that nobody else in the LLM gateway space had figured out — and a weekend of furious coding to prove it.

## The Lie of Sequential Fallback

Every LLM gateway on the market works the same way. You send a query, it tries Provider A. If A fails, it tries Provider B. If B fails, it tries Provider C.

Tidy. Simple. Wrong.

Here's what happens in production: Provider A doesn't fail cleanly. It times out after 5 seconds. Then B times out too, because it's the same class of model hitting the same bottleneck. By the time C gets your query, the user has already refreshed the page three times and opened a support ticket.

I watched this cascade destroy the user experience on a production system I was running. 15-second delays for what should have been a 2-second response. Debugging was a nightmare because we couldn't tell which provider was slow and which was actually down.

## The Weekend That Changed Everything

I had a hypothesis: instead of trying providers one at a time, what if we ran them all at once?

Not sequentially. Not with fallback chains. **Parallel execution** — fire the same query at 3 providers simultaneously, collect all responses, and pick the best one.

Friday night, I started coding. Saturday morning, I had a working prototype. Sunday, I ran the first real test.

The results were immediate:
- **138ms** baseline latency (direct to provider)
- **234ms** with the proxy (guardrails, cache, routing)
- **62% cost savings** because I could route simple queries to free/cheap models automatically

The parallel ensemble wasn't just faster. It was **more accurate**. When three models answer the same question, you can score them against each other. The ensemble consistently picked better answers than any single provider alone.

By Sunday night, I had the core insight that would define the project: *nobody does parallel multi-LLM execution with result merging. Everyone does sequential fallback.*

## The 10K Milestone

I published to npm on May 14th. Version 0.1. No documentation. No README. The code was a mess of hardcoded provider keys and console.log debugging statements.

Day 1: 12 downloads. All of them were probably me testing the install.

Day 3: Someone opened an issue. A real issue, from a real person who had found the package and was trying to use it.

I panicked. Then I fixed the bug. Then I wrote a proper README.

Days 5-7: 200 downloads. Someone on Reddit mentioned it in a comment. I have no idea who. I tried to find the thread later and couldn't. An anonymous internet ghost sent 200 developers to my repo.

Day 10: 2,500 downloads. I shipped daily updates. Small things: fixing error messages, adding provider configurations, writing better examples.

Day 14: 10,024 downloads. A week later, the weekly run rate hit 5,369 — top 0.2% of all npm packages.

## What Actually Worked

I learned a few things that aren't in the growth playbooks:

**Open source IS distribution.** I didn't need to "market" anything. I needed to make something that solved a real pain point and put it where developers look for solutions — GitHub, npm, and Google. The README was my landing page. The install command was my CTA.

**Benchmarks matter more than features.** The first week, I spent more time running benchmarks than writing code. The question every developer asks is "how fast is it?" and "how much will it save me?" I published real numbers from real API calls: 138ms baseline, 96.77% RouterArena accuracy, 62% cost savings. Those numbers drove more downloads than any feature.

**Ship every day.** A new version every 24 hours isn't noise — it's proof of life. It tells users "this project is active, bugs get fixed, new things get added." I published 14 versions in 14 days.

## The Numbers That Matter

| Metric | Value |
|--------|-------|
| Weekly downloads | 5,369 (top 0.2% of npm) |
| 14-day run rate | 10,024 |
| Daily average | 716 |
| Cost savings | 62% vs all-premium |
| Providers supported | 47+ |
| Routing accuracy | 96.77% |
| Package size | 19.5 KB |

## What's Next

The project is called **A3M Router** (adaptive-memory-multi-model-router). It's open source under MIT.

I'm building three things next:

1. **MCP server** — so AI agents (Claude Code, Cursor) can ask A3M "which provider should I use for this query?" and get a routing decision in <1ms
2. **LangChain integration** — drop-in replacement for LangChain's model routing
3. **Confidence voting** — weighted ensemble merging where each provider's past accuracy influences its vote weight

The MCP server is the one I'm most excited about. AI agents burn through API calls. Every decision loop spawns 5-10 LLM queries. A smart router can cut that cost in half and make agents resilient to provider outages.

## Try It

```bash
npm install -g adaptive-memory-multi-model-router
npx a3m-router serve
```

Or check the repo: [github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)

Star it if it saves you money. That's how open source grows.
