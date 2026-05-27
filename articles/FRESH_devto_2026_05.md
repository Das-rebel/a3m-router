---
title: "Fastest-Growing npm LLM Router Hits 10K Downloads in 14 Days — Here's What We Did Right"
published: false
description: "How an open-source LLM router went from 0 to 10,024 downloads in 14 days with parallel multi-LLM execution, independent benchmarks, and zero marketing spend."
tags: llm, opensource, typescript, ai, devops
cover_image: https://raw.githubusercontent.com/Das-rebel/a3m-router/main/docs/benchmark-chart.png
---

Two weeks ago we published a 19.5 KB LLM router. No launch post. No Hacker News. No Twitter thread.

Today: **10,024 downloads. 5,369/week. 72 versions. 47 providers.**

This is the story of what happened, why it grew, and the exact features that drove adoption.

---

## The Starting Point

Most LLM routers work like this:

```
try Provider A → fails → try Provider B → fails → try Provider C
```

Sequential fallback. One at a time. If A is slow, everything waits.

**Nobody does parallel multi-LLM execution with result merging.** Not litellm (48K stars), not one-api (34K stars), not LibreChat (20K stars). They all try providers in order.

We built the thing that's missing: **run all providers at once, score the results, pick the best.**

```javascript
const result = await executeEnsemble(
  "Write a Python sort function",
  systemPrompt, context,
  { nvidia: callNvidia, groq: callGroq }
);
console.log(`Winner: ${result.winner}`);  // → nvidia
console.log(`Reason: ${result.reasoning}`);  // → scored higher on specificity
```

## The Feature That Got Traction: Parallel Ensemble

Three months ago, a Reddit thread with 157 upvotes showed someone manually stacking Groq + Gemini + OpenRouter. They were hacking together what we automated.

The insight that drove adoption wasn't "yet another LLM gateway" — it was **confidence-weighted ensemble voting**. Run N providers simultaneously, score each result on specificity and structure, return the best with transparent reasoning.

This is the one thing no competitor does.

| Competitor | Stars | Approach |
|-----------|-------|----------|
| litellm | 48K | Sequential fallback only |
| one-api | 34K | API key management only |
| LibreChat | 20K | UI-focused, single-provider |
| gpt-researcher | 20K | Single-provider per query |
| **A3M Router** | **4** | **Parallel ensemble + scoring** |

## The Benchmark That Closed the Deal

Every gateway adds latency. Most don't publish their numbers. We ran ours through [llm-gateway-bench](https://github.com/taffy-owo/llm-gateway-bench) — a third-party benchmarking tool — and published everything:

| Scenario | TTFT | Overhead |
|:---------|:----:|:--------:|
| Direct to Groq (baseline) | **138ms** | — |
| Through A3M (forced route) | **234ms** | +96ms |
| Through A3M (auto route) | **374ms** | +236ms |

The 236ms overhead saves **62% on API costs** — ~$2,604/year at 100K queries/month.

**Why this mattered:** Developers are tired of gateways that claim "negligible overhead" without publishing numbers. We benchmarked with an independent tool, showed the real overhead, and let the data speak.

## The Growth Mechanics (Zero Marketing)

```
Day 1:    552 downloads
Day 7:  1,903 downloads  ← first weekend spike
Day 14: 5,369/week       ← steady run rate
Total:  10,024 downloads
```

No blog post. No HN launch. No Twitter thread. Just:

1. **A clear README** that shows the benchmark chart front and center
2. **One obvious thing nobody else does** (parallel ensemble)
3. **Honest numbers** (not "negligible overhead" — real ms measurements)

That's it. Developers find it through npm search, try it, tell other developers.

## What's Inside (19.5 KB)

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve     # OpenAI-compatible proxy at :8787
npx a3m-router route "Write a Python sort"   # Routing decision
npx a3m-router compare "Explain AI"          # Side-by-side providers
```

| Feature | What it does |
|:--------|:-------------|
| Parallel ensemble | Run N providers at once, score, pick best |
| Query presets | Auto-configure provider + temp per task type |
| RouteLLM routing | 12 signals → cheapest capable model (99.5%) |
| Cost tracking | Per-query + budget enforcement |
| Memory | Cross-session persistence via JSON |
| Security | Prompt injection guardrails (17 patterns) |

## The Lesson

**You don't need a launch strategy if your tool does one thing nobody else does, and you publish honest numbers.**

We benchmarked with a third-party tool instead of fabricating numbers. We showed the real latency overhead instead of hiding it. We built the feature Reddit users were hacking together manually.

10K downloads in 14 days — zero marketing spend.

---

*GitHub: [github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)*  
*npm: `npm install adaptive-memory-multi-model-router`*  
*Benchmark methodology: [docs/BENCHMARK.md](https://github.com/Das-rebel/a3m-router/blob/main/docs/BENCHMARK.md)*
