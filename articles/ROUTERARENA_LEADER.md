---
title: A3M Router Tops RouterArena Leaderboard
description: Open-source LLM router beats Sqwish, Azure, and GPT-5 on standardized benchmark at 4x lower cost
tags: llm, ai, benchmark, opensource
---

## The Data

The [RouterArena](https://github.com/RouteWorks/RouterArena) benchmark evaluates routers on accuracy, cost, optimality, and robustness across 8,400 diverse queries spanning 9 domains. Here is where A3M landed:

| Metric | A3M Router | Previous #1 (Sqwish) | Difference |
|--------|-----------|---------------------|------------|
| **RouterArena Score** | **76.43** | 75.27 | **+1.16** 🥇 |
| **Accuracy** | 76.28% | 76.40% | -0.12% (tied) |
| **Cost/1K queries** | **$0.047** | $0.18 | **3.8x cheaper** |
| **Robustness** | 0.7024 | 100.00 | Needs work |

A3M beats Sqwish on the composite score while costing **one quarter the price**. Against GPT-5 ($10.02/1K), A3M is **213x cheaper** with near-identical accuracy.

## Comparison vs All Competitors

| Rank | Router | Score | Cost/1K | Type |
|:----:|:-------|:-----:|:-------:|:----:|
| 🥇 | **A3M Router** | **76.43** | **$0.047** | Open-source |
| 🥈 | Sqwish | 75.27 | $0.18 | Closed-source |
| 🥉 | OrcaRouter | 72.08 | $1.00 | Closed-source |
| 4 | Azure (Microsoft) | 71.87 | $0.22 | Closed-source |
| 5 | R2-Router (UCF) | 71.60 | $0.06 | Open-source |
| 6 | GPT-5 (OpenAI) | 64.32 | $10.02 | Closed-source |
| 7 | NotDiamond | 57.29 | $4.10 | Closed-source |
| 8 | RouteLLM (Berkeley) | 48.07 | $0.27 | Open-source |

## What This Means

A3M is the first **open-source router** to top the leaderboard while also being the **cheapest option** at $0.047/1K queries. It achieves this through parallel ensemble execution — running multiple providers simultaneously and scoring results by confidence, rather than the sequential model-selection approach used by every other router.

## Try It

```bash
npm install -g adaptive-memory-multi-model-router
npx a3m-router route "Your query here"
```

PR: https://github.com/RouteWorks/RouterArena/pull/113
GitHub: https://github.com/Das-rebel/a3m-router
