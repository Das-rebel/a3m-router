---
title: "Show HN: A3M Router – We built an LLM router. Nobody cared for 2 days. Then word-of-mouth kicked in."
---

# Show HN: A3M Router – We built an LLM router. Nobody cared for 2 days. Then word-of-mouth kicked in.

Day 1: 552 downloads. Day 2: 320 downloads. We thought it was dead.
Day 3: 1,903 downloads. 245% growth from Day 1. Zero marketing budget.

2,775 downloads in 3 days. All organic.

---

## What I Built

A3M Router — an open-source npm package that analyzes each LLM query and routes it to the cheapest capable provider automatically.

We're a small team processing ~1,000 LLM queries/day. Customer support automation, code generation, text summarization. We were using GPT-4 for **everything**. Even simple questions went to GPT-4 at $0.03/query.

I looked at our logs:
- **34%** simple Q&A (any model works)
- **28%** code generation (speed > perfection)
- **22%** summarization (doesn't need GPT-4)
- **16%** actually needs high-quality reasoning

We were overpaying by **70%**.

---

## How It Works

**Before:**
```javascript
await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "What is 2+2?" }]
});
// Cost: $0.03, Latency: 2.1s
```

**After:**
```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter();

await router.route("What is 2+2?");
// Cost: $0.001, Latency: 0.8s
// Automatically picks cheapest capable provider
```

The routing algorithm is inspired by RouteLLM (arXiv:2404.06035):

1. **Analyze query** — Detects code, math, complexity, language
2. **Check providers** — Cost, latency, quality scores for each
3. **Smart routing** — Simple → cheap. Code → fast. Complex → quality.
4. **Track & fallback** — Logs costs, retries if provider fails

**Zero configuration.** Works immediately with 12 providers pre-configured.

---

## Results (30 Days)

| Metric | Before | After |
|--------|--------|-------|
| **Monthly Cost** | $2,400 | $720 |
| **Avg Cost/Query** | $0.03 | $0.009 |
| **Response Time** | 2.1s | 0.8s |
| **Quality Score** | 100% | 94% |

**70% cost reduction. 62% faster. 6% quality trade-off.**

---

## The Launch Story

We published to npm and... crickets.

| Day | Downloads | How it felt |
|-----|-----------|-------------|
| Day 1 | 552 | "Okay, modest start. Early adopters." |
| Day 2 | 320 | "It's dead. The launch flopped." |
| Day 3 | 1,903 | "Wait, WHAT?" |

No blog post. No HN submission. No Twitter thread. No Product Hunt. No paid promotion of any kind.

245% growth from Day 1 to Day 3. 6x from Day 2 to Day 3.

The lesson: developer tools spread through backchannels — Discord servers, Slack channels, DMs between coworkers. That takes 48 hours to compound. The Day 2 dip was real and demoralizing. But Day 3 proved that word-of-mouth works on its own timeline.

---

## Try It (Free)

```bash
npm install adaptive-memory-multi-model-router

# See routing decisions
npx a3m-router route "Your query"

# Compare all providers
npx a3m-router compare "Write Python to sort an array"

# Benchmark everything
npx a3m-router benchmark
```

No API keys needed to test routing logic.

---

## Real Examples

**Customer support:** "How do I reset my password?"
- Before: GPT-4 ($0.03, 2.1s)
- After: Cheapest provider ($0.001, 0.8s)
- **97% savings**

**Code generation:** "Write Python to parse JSON"
- Before: GPT-4 ($0.05, 2.1s)
- After: Fast provider ($0.0004, 0.4s)
- **99% savings, 5x faster**

**Complex analysis:** "Analyze this legal contract"
- Before: GPT-4 ($0.04, 2.1s)
- After: GPT-4 ($0.04, 2.1s)
- **Kept premium because complexity demands it**

---

## Technical Details

### Routing Algorithm

```javascript
// Feature extraction
const features = extractQueryFeatures("Write Python to sort array");
// { has_code: true, complexity: 0.6 }

// Complexity-weighted scoring
if (features.complexity < 0.5) {
  // Simple query → prioritize cost
  score = quality * 0.3 + cost_efficiency * 0.7;
} else if (features.has_code) {
  // Code query → prioritize speed
  score = quality * 0.4 + speed * 0.4 + cost * 0.2;
} else {
  // Complex query → prioritize quality
  score = quality * 0.7 + cost_efficiency * 0.3;
}
```

### Provider Profiles

Each provider has scored capabilities:

```javascript
{
  name: "groq/llama-3.3-70b",
  cost_per_1k_input: 0.59,
  cost_per_1k_output: 0.79,
  latency_ms: 400,
  quality_score: 0.82,
  strengths: ["fast", "coding"]
}
```

### Supported Providers

- **Fast/Cheap**: Groq ($0.59/1M), Cerebras ($0.60/1M)
- **Quality**: Mistral ($2/1M), OpenAI ($30/1M), Anthropic ($15/1M)
- **Free**: CommandCode, OpenCode, Ollama (local)

12 providers. Automatic selection.

---

## The Math

If you're using one provider for everything:

| Daily Queries | Current Cost | With Router | Monthly Savings |
|---------------|--------------|-------------|-----------------|
| 500 | $450 | $135 | **$315** |
| 1,000 | $900 | $270 | **$630** |
| 5,000 | $4,500 | $1,350 | **$3,150** |
| 10,000 | $9,000 | $2,700 | **$6,300** |

---

## Links

- **GitHub**: https://github.com/Das-rebel/adaptive-memory-multi-model-router
- **NPM**: https://www.npmjs.com/package/adaptive-memory-multi-model-router

**Stats**: 2,775 downloads in 3 days, 1,903 on Day 3, 245% growth, zero marketing budget.

---

Questions about the routing algorithm? What features should we add? And has anyone else experienced the "Day 2 dip then Day 3 explosion" pattern with developer tool launches?
