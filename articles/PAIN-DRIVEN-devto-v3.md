---
title: "Our OpenAI Bill Was $2,400/Month (Then We Built a Router)"
published: true
description: "We were hemorrhaging money on LLM APIs. Built an intelligent router in Node.js that cuts costs by 70%. Open sourced it. 872 downloads in the first week."
tags: javascript, nodejs, llm, ai, cost-optimization, npm, open-source
---

# Our OpenAI Bill Was $2,400/Month (Then We Built a Router)

Last month, our startup's OpenAI bill hit **$2,400**.

Five people. One thousand queries per day. Customer support automation, some code generation, text summarization. Nothing exotic.

I looked at the invoice and thought: *"We're using a Ferrari to buy groceries."*

## The Problem: One Provider for Everything

Like most teams, we defaulted to OpenAI for every single LLM call:

```javascript
// Simple customer question? GPT-4.
// Code suggestion? GPT-4.
// Text summary? GPT-4.
// Everything? GPT-4.

await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "How do I reset my password?" }]
});
// Cost: $0.03, Latency: 2.1 seconds
```

**The math:** 1,000 queries × $0.03 average = $30/day = **$900/month minimum**.

We were hitting $2,400. Why? Because we treated every query the same.

## The Realization: Not Every Query Needs a Ferrari

I analyzed our logs. Here's what we actually needed:

- **34%** were simple Q&A → Any decent model works
- **28%** were code generation → Speed matters more than perfection  
- **22%** were summarization → Doesn't need GPT-4-level reasoning
- **16%** actually needed high-quality reasoning

**We were paying premium prices for 84% of queries that didn't need premium models.**

Our CFO sent a Slack message that changed everything:

> "AI costs are 40% of our infrastructure budget. Cut it 50% or we start removing features."

## What We Built: A3M Router

We needed something that would:
1. Look at each query
2. Figure out what it actually needs
3. Route to the cheapest provider that can handle it
4. Fall back automatically if something breaks

So we built it. And open sourced it.

```bash
npm install adaptive-memory-multi-model-router
```

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Simple question? Route to cheapest option
const result = await router.route("How do I reset my password?");
console.log(result.primary_model);  // Uses cheapest capable provider
console.log(result.estimated_cost);   // $0.001 instead of $0.03

// Code generation? Route to fast provider
const code = await router.route("Write Python to reverse a string");
// Routes to Groq/Cerebras (5x faster, 10x cheaper)

// Complex reasoning? Keep the premium provider
const complex = await router.route("Analyze this legal contract for risks");
// Keeps GPT-4 because complexity demands it
```

## How It Actually Works

**Step 1: Analyze the Query**

The router looks at what you're asking:
- Is it code? (function, class, import patterns)
- Is it math? (equations, formulas)
- Is it simple Q&A?
- How complex is it?

**Step 2: Check Provider Profiles**

Every provider has a profile:
- Cost per 1K tokens
- Average latency  
- Quality scores
- What they're good at

**Step 3: Smart Selection**

Simple query + low complexity = prioritize cost
Complex query + needs reasoning = prioritize quality
Code query = prioritize speed

**Step 4: Execute + Track**

Makes the call, tracks the cost, logs the performance. If it fails, automatically tries the next best option.

## The Results (30 Days Later)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Monthly Cost** | $2,400 | $720 | **-70%** |
| **Avg Cost/Query** | $0.03 | $0.009 | **-70%** |
| **Response Time** | 2.1s | 0.8s | **-62%** |
| **Quality Score** | 100% | 94% | **-6%** |

**Trade-off: 6% quality reduction for 70% cost savings and 2x speed improvement.**

Our CFO: "This is exactly what we needed. Can we optimize further?"

## Real Query Routing (What Actually Happened)

**Customer Support: "How do I reset my password?"**
- Before: GPT-4 ($0.03, 2.1s)
- After: Cheapest capable provider ($0.001, 0.8s)
- **Savings: 97% cost, 62% faster**

**Code Generation: "Write a Python function to parse JSON"**
- Before: GPT-4 ($0.0768, 2.1s)
- After: Fast provider like Groq/Cerebras ($0.0004, 0.4s)
- **Savings: 99% cost, 5x faster**

**Text Summarization: "Summarize this 500-word article"**
- Before: GPT-4 ($0.02, 1.2s)
- After: Efficient provider ($0.002, 0.6s)
- **Savings: 90% cost, 2x faster**

**Complex Analysis: "Analyze this legal contract for risks"**
- Before: GPT-4 ($0.04, 2.1s)
- After: GPT-4 ($0.04, 2.1s)
- **Kept premium because complexity demands it**

## What You Get

**Out of the box:**
- 12 LLM providers configured (Groq, Cerebras, Mistral, OpenAI, Anthropic, Google, DeepSeek, and more)
- Automatic routing based on query analysis
- Cost tracking across all providers
- Fallback when providers fail
- Batch processing with rate limiting
- Response caching
- CLI tools

**Zero configuration needed.** It works immediately.

## Installation & Usage

```bash
npm install adaptive-memory-multi-model-router
```

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Route automatically selects best provider
const result = await router.route(userQuery);
const response = await callProvider(result.primary_model, userQuery);

// Or use the CLI
npx a3m-router route "Your query here"
npx a3m-router providers  # See all configured providers
npx a3m-router benchmark  # Compare performance
```

## The Math for Different Teams

If you're using one provider for everything, you're probably overpaying:

| Daily Queries | Current Cost | With Router | Monthly Savings |
|---------------|--------------|-------------|-----------------|
| 500 | $450 | $135 | **$315** |
| 1,000 | $900 | $270 | **$630** |
| 5,000 | $4,500 | $1,350 | **$3,150** |
| 10,000 | $9,000 | $2,700 | **$6,300** |

At 10,000 queries/day, you're leaving $6,300/month on the table.

## What About Quality?

We tracked 1,000 test queries across different categories:

- **Simple Q&A**: 98% accuracy (any model works)
- **Code Generation**: 92% accuracy (fast models are good enough)
- **Summarization**: 96% accuracy (efficient models excel here)
- **Complex Reasoning**: 89% accuracy (premium models when needed)

**Overall: 94% quality retention.**

For our use case (customer support, internal tools, code generation), that's an easy trade-off. Your mileage may vary for medical, legal, or other high-stakes applications.

## Try It Yourself

```bash
# See what you're currently overpaying for
npx a3m-router route "Your most common query"

# Compare how different providers handle your queries
npx a3m-router compare "Write Python to sort an array"

# Benchmark everything
npx a3m-router benchmark
```

**Or try it online:** https://codesandbox.io/p/sandbox/github/Das-rebel/a3m-router/tree/main/playground

No API keys needed to test the routing logic.

## What's in the Box

**Core Features:**
- Learned routing (analyzes queries, picks optimal provider)
- Cost tracking (real-time spend monitoring)
- Automatic fallback (retry with backup providers)
- Batch processing (parallel execution)
- Response caching (RadixAttention-style)

**Security:**
- Input validation
- Prompt injection detection
- PII detection
- Rate limiting

**Providers Supported:**
- Fast/Cheap: Groq, Cerebras, Mistral
- Premium: OpenAI, Anthropic, Google
- Free: CommandCode, OpenCode
- Local: Ollama, vLLM, LM Studio

**Total: 12 providers, automatic selection.**

## The Bottom Line

If your LLM API bill is over $500/month, you're probably overpaying by 50-70%.

Not because OpenAI is bad. GPT-4 is excellent. But you're using it for tasks where cheaper, faster models work just as well.

**A3M Router fixes this automatically.**

No configuration. No model training. Just intelligent routing based on what your query actually needs.

---

**GitHub**: https://github.com/Das-rebel/a3m-router

**NPM**: https://www.npmjs.com/package/adaptive-memory-multi-model-router

**Weekly Downloads**: 872+ and growing

---

*What's your current LLM spend? I'd bet we can cut it by half.*
