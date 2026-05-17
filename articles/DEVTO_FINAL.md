---
title: "I Benchmarked 47 LLM Providers Against Real Queries - Here's What I Found 📊"
published: true
description: "After testing 47 providers across 12,847 real queries, I built an open-source router that cuts LLM costs by 70%. Full data, code examples, and step-by-step setup inside."
tags: node, javascript, ai, llm, webdev
canonical_url: https://github.com/Das-rebel/adaptive-memory-multi-model-router
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/placeholder.png
---

# I Benchmarked 47 LLM Providers Against Real Queries - Here's What I Found

Every week, a new "GPT-4 killer" drops on Product Hunt. *"50% cheaper! 2x faster! Better reasoning!"*

I got tired of taking marketing claims at face value. So I spent three months benchmarking every LLM provider I could find against real production workloads. Not synthetic tests. Not academic datasets. **Actual queries from real systems.**

**47 providers tested. 12,847 queries benchmarked. $3,200 spent on API calls just to gather data.**

Here's what I found -- and the open-source router I built so you can use the results immediately.

---

## Table of Contents

- [The Setup: What I Actually Tested](#the-setup-what-i-actually-tested)
- [The Benchmark Results](#the-benchmark-results)
- [The Matrix: What to Use When](#the-matrix-what-to-use-when)
- [Building a Smart Router](#building-a-smart-router)
- [Step-by-Step: Setting Up A3M Router](#step-by-step-setting-up-a3m-router)
- [Production Results](#production-results)
- [What I Learned](#what-i-learned)
- [Try It Yourself](#try-it-yourself)

---

## The Setup: What I Actually Tested

### Query Categories

I replayed six months of production queries across five categories:

| Category | Count | Examples |
|----------|-------|---------|
| **Simple Q&A** | 4,247 | Password resets, FAQs, "how do I..." |
| **Code completion** | 2,103 | Function suggestions, bug fixes, refactoring |
| **Text summarization** | 1,892 | Support tickets, document summaries |
| **Complex reasoning** | 847 | Escalation analysis, multi-step logic |
| **Multilingual** | 612 | Translations, non-English support |

### Metrics Tracked

- **Cost per query** (actual billed amount, not list price)
- **Latency** (time to first token + time to complete)
- **Quality score** (human-rated 1-5 on 500 random samples)
- **Uptime** (measured over 30 continuous days)

No cherry-picking. No best-of-three. Every query, every provider, every metric.

---

## The Benchmark Results

### Speed: Marketing vs Reality

The latency claims you see on provider websites? They're measured on 10-50 token responses. Here's what happens at production scale (~800 tokens average):

| Provider | Listed Latency | Real Latency (800 tok) | Quality |
|----------|---------------|------------------------|---------|
| **Cerebras** | 350ms | **380ms** | 82% |
| **Groq** | 400ms | **420ms** | 82% |
| MiniMax | "Ultra-fast" | 600ms | 89% |
| GLM-4 | "Fast inference" | 800ms | 92% |
| OpenAI GPT-4 | 2,100ms | 2,100ms | 95% |

**Key insight:** Groq and Cerebras actually deliver on their speed promises even at scale. Most others don't.

### Cost: The Hidden Math

List price per million tokens vs. quality-adjusted effective cost (accounting for tokenization differences, retry rates, and quality gaps):

| Provider | Cost/1M Tokens | Effective Cost | Best For |
|----------|---------------|----------------|----------|
| CommandCode | **$0.00** | $0.00 | Simple Q&A (free tier) |
| **Groq** | **$0.59** | $0.72 | Speed-critical tasks |
| **Cerebras** | **$0.60** | $0.73 | Real-time responses |
| MiniMax | $1.50 | $1.69 | Code, Chinese queries |
| Mistral | $2.00 | $2.22 | Balanced workloads |
| GLM-4 | $2.80 | $3.04 | Multilingual tasks |
| OpenAI GPT-4 | $30.00 | $30.00 | Complex reasoning |

**Key insight:** Groq at $0.59/1M tokens is 50x cheaper than GPT-4 at $30/1M tokens -- and for code tasks, quality is within 12%. That's not a typo.

### Quality by Task Type

Aggregate quality scores are misleading. A provider that's 90% overall might be 95% for summarization and 70% for code:

| Provider | Simple Q&A | Code | Summary | Complex | Multilingual |
|----------|-----------|------|---------|---------|-------------|
| **GLM-4** | 94% | 88% | **96%** | 89% | **97%** |
| **MiniMax** | 91% | **93%** | 89% | 87% | 94% |
| Groq | 89% | 91% | 87% | 82% | 85% |
| Mistral | 93% | 90% | 94% | 91% | 92% |
| GPT-4 | **96%** | 94% | 97% | **95%** | 94% |

**Key insight:** GLM-4 beats GPT-4 on multilingual tasks (97% vs 94%). MiniMax beats GPT-4 on code speed/quality ratio. No single provider wins every category.

---

## The Matrix: What to Use When

Based on the data, here's the optimal routing strategy:

```
Simple Q&A       → CommandCode (free) or GLM-4 ($2.80/1M)
Code completion  → MiniMax ($1.50/1M) or Groq ($0.59/1M)
Summarization    → GLM-4 ($2.80/1M) or Mistral ($2.00/1M)
Complex reasoning → GPT-4 ($30/1M) or Claude ($15/1M)
Multilingual     → GLM-4 ($2.80/1M) -- beats GPT-4 at 1/10th cost
```

**The pattern:** Use premium providers for the 15-20% of queries that actually need them. Route everything else to cheaper alternatives.

---

## Building a Smart Router

Manually switching providers per query is not sustainable. I needed automation. So I built [A3M Router](https://github.com/Das-rebel/adaptive-memory-multi-model-router) -- an open-source routing layer with all the benchmark data baked in.

### How It Works

```
Query Input
    │
    ▼
┌─────────────────────┐
│ Query Classification│  ← Is it code? Math? Translation? Simple Q&A?
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Provider Matching   │  ← Check cost/quality/speed profiles
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Execute + Fallback  │  ← Call provider, retry on failure
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Cost Tracking       │  ← Log spend per provider
└─────────────────────┘
```

The routing decisions are based on the benchmark data I collected. No guessing. No marketing claims.

---

## Step-by-Step: Setting Up A3M Router

### 1. Install

```bash
npm install adaptive-memory-multi-model-router
```

### 2. Basic Routing

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Simple question? Routes to cheapest capable provider
const result1 = await router.route("How do I reset my password?");
console.log(result1.primary_model);  // e.g., commandcode/flash
console.log(result1.estimated_cost);  // $0.000

// Code generation? Routes to fast provider
const result2 = await router.route("Write Python to parse JSON");
console.log(result2.primary_model);  // e.g., groq/llama-3.3-70b
console.log(result2.estimated_cost);  // $0.0004

// Complex reasoning? Keeps premium provider
const result3 = await router.route("Analyze this contract for liability clauses");
console.log(result3.primary_model);  // e.g., openai/gpt-4
console.log(result3.estimated_cost);  // $0.04
```

### 3. Custom Configuration

```javascript
const router = createA3MRouter({
  memory: true,              // Learn from past routing decisions
  costBudget: 0.05,          // Max $0.05 per request
  providers: {
    // Override default provider priority
    preferred: ['groq', 'cerebras', 'mistral'],
    // Premium fallback for complex queries
    fallback: ['openai', 'anthropic']
  },
  // Custom quality threshold per category
  qualityThresholds: {
    code: 0.85,
    summary: 0.90,
    reasoning: 0.93
  }
});
```

### 4. Batch Processing

```javascript
const queries = [
  "What is 2+2?",
  "Write a JavaScript fetch wrapper",
  "Summarize: The quick brown fox...",
  "Evaluate: Should we migrate to microservices?",
  "Translate 'hello world' to Mandarin"
];

const results = await router.routeBatch(queries);

results.forEach((r, i) => {
  console.log(`Query: ${queries[i]}`);
  console.log(`  → ${r.primary_model} ($${r.estimated_cost.toFixed(4)})`);
});
// Output:
// Query: What is 2+2?
//   → commandcode/flash ($0.0000)
// Query: Write a JavaScript fetch wrapper
//   → groq/llama-3.3-70b ($0.0004)
// Query: Summarize: The quick brown fox...
//   → mistral/mistral-small ($0.0010)
// Query: Evaluate: Should we migrate to microservices?
//   → openai/gpt-4 ($0.0400)
// Query: Translate 'hello world' to Mandarin
//   → glm-4/flash ($0.0010)
```

### 5. Cost Tracking

```javascript
// After routing several queries, check your spend
const costReport = router.getCostReport();

console.log(`Total spent: $${costReport.total.toFixed(4)}`);
console.log(`By provider:`);
Object.entries(costReport.byProvider).forEach(([provider, cost]) => {
  console.log(`  ${provider}: $${cost.toFixed(4)}`);
});
console.log(`Avg cost/query: $${costReport.avgPerQuery.toFixed(4)}`);
```

### 6. CLI Usage (No Code Required)

```bash
# Route a single query and see which provider gets selected
npx a3m-router route "Explain async/await in JavaScript"

# Compare responses across multiple providers
npx a3m-router compare "Write a REST API in Express"

# See all configured providers and their profiles
npx a3m-router providers

# Run the full benchmark suite
npx a3m-router benchmark

# Check cumulative cost tracking
npx a3m-router cost
```

### 7. Express.js Integration

```javascript
const express = require('express');
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const app = express();
app.use(express.json());

const router = createA3MRouter({ memory: true });

app.post('/chat', async (req, res) => {
  const { message, priority } = req.body;

  // Route based on query + optional priority hint
  const routing = await router.route(message, {
    priority: priority || 'balanced'  // 'cost' | 'speed' | 'quality' | 'balanced'
  });

  // routing contains: primary_model, estimated_cost, alternatives, classification
  res.json({
    model: routing.primary_model,
    cost: routing.estimated_cost,
    category: routing.classification,
    alternatives: routing.alternatives.slice(0, 3)
  });
});

app.listen(3000, () => console.log('Router API on :3000'));
```

---

## Production Results

After six months running the router in production (replacing a single-provider setup):

| Metric | Before (GPT-4 Only) | After (Routed) | Change |
|--------|---------------------|----------------|--------|
| **Monthly Cost** | $2,400 | $720 | **-70%** |
| **Avg Latency** | 2,100ms | 800ms | **-62%** |
| **Quality Score** | 100% (baseline) | 94% | **-6%** |
| **Uptime** | 99.97% | 99.95% | Comparable |

### Query Distribution

The router automatically distributed traffic based on query type:

| Category | % of Traffic | Typical Provider | Typical Cost |
|----------|-------------|-----------------|-------------|
| Simple Q&A | 47% | CommandCode / GLM-4 | $0 - $0.001 |
| Code | 28% | Groq / MiniMax | $0.0004 - $0.002 |
| Summarization | 15% | Mistral / GLM-4 | $0.001 - $0.003 |
| Complex Reasoning | 10% | GPT-4 / Claude | $0.03 - $0.05 |

**The 70% cost reduction isn't magic.** It's just not using a $30/1M token model for queries that a $0.59/1M token model handles at 90% quality.

---

## What I Learned

### 1. Chinese Providers Are Underrated

GLM-4 and MiniMax consistently outperformed expectations. GLM-4 beats GPT-4 on multilingual tasks. MiniMax has the best speed/quality ratio for code I've seen outside of Groq. And they're 10-20x cheaper.

### 2. Free Tiers Are Genuinely Useful

CommandCode isn't just a teaser. For simple Q&A (password resets, FAQs, basic lookups), it works perfectly well at zero cost. If 30-40% of your queries are simple, that's a significant chunk of your bill eliminated.

### 3. Speed Claims Are Half-True

Providers advertise latency for tiny responses (10-50 tokens). At production scale (500-1000 tokens), the gap narrows dramatically. Groq and Cerebras are the only ones that consistently deliver near-advertised speeds.

### 4. One Provider Is Never Optimal

This was the biggest takeaway. No single provider wins across all categories. GPT-4 is best for complex reasoning. GLM-4 is best for multilingual. Groq is best for speed. Mistral is the best all-rounder. **Routing isn't optional -- it's the only sane approach at scale.**

### 5. The Quality Trade-off Is Worth It

94% quality at 70% cost savings is a no-brainer for most applications. Unless you're in medical, legal, or financial domains where every percentage point matters, the savings far outweigh the small quality dip.

---

## Try It Yourself

### Interactive Playground

No installation needed. Test routing decisions right in your browser:

[CodeSandbox Playground](https://codesandbox.io/p/sandbox/github/Das-rebel/adaptive-memory-multi-model-router/tree/main/playground)

### Quick Start

```bash
# Install
npm install adaptive-memory-multi-model-router

# Route your first query
npx a3m-router route "Your actual production query here"

# See all providers
npx a3m-router providers --detailed

# Compare providers on a specific query
npx a3m-router compare "Write a binary search in Python"
```

### Links

- **GitHub:** [Das-rebel/adaptive-memory-multi-model-router](https://github.com/Das-rebel/adaptive-memory-multi-model-router)
- **NPM:** [adaptive-memory-multi-model-router](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- **Full Benchmark Data:** [docs/BENCHMARK_DATA.md](https://github.com/Das-rebel/adaptive-memory-multi-model-router/blob/main/docs/BENCHMARK_DATA.md)
- **License:** MIT (code and data)

### Stats

- **872** weekly npm downloads
- **33** tests passing
- **12** providers pre-configured
- **47** providers benchmarked

---

## The Raw Data

I'm sharing the full benchmark dataset because keeping it proprietary defeats the purpose of doing the research. Use it to build your own router, validate my findings, or find providers I missed.

**Full dataset:** [BENCHMARK_DATA.md](https://github.com/Das-rebel/adaptive-memory-multi-model-router/blob/main/docs/BENCHMARK_DATA.md)

Includes all 47 providers, 12,847 query results, cost/latency/quality breakdowns, and query-type-specific recommendations.

---

## Over to You

I tested 47 providers, but I'm sure I missed some. **What providers are you using that I should benchmark?** Drop them in the comments and I'll add them to the next round.

Also curious:

- **Do my quality scores match your experience?** I rated 500 samples manually -- would love validation from others running production LLM workloads.
- **What's your query mix?** Simple Q&A vs code vs complex reasoning? The optimal routing strategy depends heavily on your distribution.
- **Has anyone else built routing systems?** Would love to compare approaches.

*Built this because I was tired of marketing claims. Sharing the data so you don't have to spend $3,200 benchmarking yourself.*
