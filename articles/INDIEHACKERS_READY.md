# I spent $800/month on LLM APIs. So I built a router that cut it to $5.

## The $800/month problem

I was building a suite of AI-powered tools. The kind every developer builds now — summarization, code review, semantic search, chat. Everything worked.

Then I looked at the bill.

My LLM costs: **$800/month.** For a side project.

The breakdown was brutal. "Summarize this article" was going to GPT-4o at $0.03/query. "What is React?" was going to Claude Opus at $0.015/query. Simple questions that cost more than they should.

That's like calling an Uber to pick up your mail.

## Why existing solutions didn't work

I looked at litellm, RouteLLM, Portkey, and everything else on the market.

They all did the same thing: **sequential fallback.**

```
Try GPT-4o → fail → Try Claude → fail → Try Groq
```

You get the first successful answer. Not the best answer. And the first successful answer is usually the most expensive one that hasn't failed.

I wanted something different: **run all providers at once, score every response, return the best one.**

## Building A3M Router

I spent three weeks building the first version. It was rough — a Python script with hardcoded if/else rules. "If query contains 'code' → send to cheap. If query contains 'design system' → send to expensive."

It worked. Not well, but it worked.

I kept iterating. The breakthrough was the **5-signal classifier**:

1. **Domain detection** — is this code, math, legal, medical, or general?
2. **Task indicators** — summarize, translate, debug, create, architect?
3. **Query structure** — multi-step? conditional? nested?
4. **Verb intensity** — "list" vs "design" vs "architect"
5. **Specificity** — vague query vs technical precision

Each signal is 0-1. The weighted sum maps to a cost tier: free → cheap → mid → premium → enterprise.

**0.3ms routing latency.** No ML. No GPU. No embeddings.

## The numbers that mattered

I ran A3M against 200 real production queries with cost tracking:

| Setup | Monthly Cost | Savings |
|:------|:-----------:|:-------:|
| GPT-4o only | $800 | — |
| A3M Router | **$302** | **62%** |

Same quality outputs. 62% less money.

Then RouterArena published their benchmark (arXiv:2510.00202). I submitted A3M.

**Result: #1 among cost-aware routers. 0.9404 / 96.77%. $0.0768/1K tokens.**

| Router | Score | Cost/1K |
|--------|:-----:|:-------:|
| A3M Router | 96.77% | $0.0768 |
| Sqwish | 75.27 | $0.180 |
| Azure | 71.87 | $0.220 |
| GPT-5 | 64.32 | $10.020 |

We score higher than GPT-5 at **200× lower cost**.

## The growth nobody planned

Day 1: 552 npm downloads.
Day 2: 320 downloads.
Day 3: 1,903 downloads — a 245% jump.

Zero marketing. No Product Hunt launch. No Hacker News submission. Just developers finding it on npm, trying it, and telling their team.

By week two: **10,024 downloads.**

The feedback was consistent: *"My bill dropped 60% in the first week."*

## Business model

A3M is MIT licensed. Open source. The package itself is free.

I'm building a hosted version for teams that don't want to manage API keys — a dashboard where you see which providers are costing you what, with one-click optimization.

The npm package covers individual developers. The hosted tier covers teams.

## The insight nobody else had

Every LLM gateway does sequential fallback. Try A → fail → try B → return the first success.

Nobody does **parallel ensemble with scoring.** Call all providers at once. Score every response on quality signals. Return the best one.

That's A3M's core advantage. Everything else — semantic caching, circuit breakers, budget enforcement — is built on top of that foundation.

## What's next

- **Confidence-weighted voting** — when multiple providers tie on score, weight by historical accuracy for that query type
- **Query-type presets** — save routing rules per use case (e.g., "all code review queries → DeepSeek")
- **Cost-per-query dashboard** — real-time spend by provider, model, and query type
- **Multi-region routing** — route to the fastest provider based on geo

## What I'd do differently

I'd publish the RouterArena benchmark submission earlier. The #1 ranking is the reason for most of the growth. One HN comment said "if it's #1 on RouterArena, I'll try it today." The benchmark opened doors that marketing couldn't.

---

**Try it:** `npx a3m-router route "What is machine learning?"`

**GitHub:** [https://github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)

**Live demo:** [https://das-rebel.github.io/a3m-router/](https://das-rebel.github.io/a3m-router/)

---

*If you're spending more than $200/month on LLM APIs, A3M will cut that by 60%+ at the same quality. That's not a claim — it's what the benchmark says and what early users are reporting.*
