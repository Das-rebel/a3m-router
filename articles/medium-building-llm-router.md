---
title: Building a Production-Ready LLM Router: Lessons from 872 Weekly Downloads
subtitle: How we created an intelligent routing system that optimizes cost vs quality for multi-provider LLM applications
---

# Building a Production-Ready LLM Router: Lessons from 872 Weekly Downloads

After 18 versions and 872 weekly downloads on npm, here's what we learned building `adaptive-memory-multi-model-router` - a learned LLM routing system for production applications.

## Why LLM Routing Matters

Most applications use a single LLM provider (usually OpenAI). This is expensive and suboptimal:

- **Cost**: GPT-4 costs $0.03/1K tokens. Groq costs $0.59/1M tokens (50x cheaper).
- **Latency**: Some providers are 10x faster for specific tasks.
- **Reliability**: Single provider = single point of failure.
- **Quality**: Different models excel at different tasks.

## The Architecture

```
Query → Feature Extraction → Router → Provider Selection → Execution
         ↓                      ↓              ↓
    Code? Math?          Cost/Quality    Fallback Chain
    Translation?         Tradeoff        Health Checks
```

### 1. Feature Extraction

We analyze queries for:
- **Code patterns**: function, class, import, def
- **Math notation**: ∫, ∑, √, equations
- **Language**: Multilingual detection (Chinese, Japanese, etc.)
- **Task type**: translation, creative writing, reasoning
- **Complexity**: Length + pattern density

### 2. Model Profiles

Each provider model has a profile:

```javascript
{
  name: "groq/llama-3.3-70b",
  provider: "groq",
  cost_per_1k_input: 0.59,
  cost_per_1k_output: 0.79,
  latency_ms: 400,
  quality_score: 0.82,
  strengths: ["fast", "coding"],
  context_window: 128000
}
```

### 3. Routing Algorithm

Inspired by RouteLLM (arXiv:2404.06035):

```javascript
// Complexity-weighted scoring
if (complexity < 0.5) {
  // Simple query → prioritize cost
  score = quality * 0.3 + cost_efficiency * 0.7;
} else {
  // Complex query → prioritize quality
  score = quality * 0.7 + cost_efficiency * 0.3;
}
```

## Key Design Decisions

### 1. Generic Provider System

Users can add any provider without code changes:

```json
// ~/.config/a3m-router/providers.json
{
  "providers": {
    "my-provider": {
      "baseUrl": "https://api.myprovider.com",
      "apiKeyEnv": "MY_API_KEY",
      "models": ["my-model"],
      "type": "api"
    }
  }
}
```

### 2. Learned vs. Rule-Based

We started with rule-based routing (if code → use provider X). It didn't scale.

Now we use learned routing:
- Online learning from actual performance
- Quality ratings from user feedback
- Latency updates from real measurements

### 3. Cost Tracking

Real-time spend monitoring:

```javascript
const router = createA3MRouter();
const summary = router.costTracker.getSummary();

console.log(`Total: $${summary.totalSpent}`);
console.log(`By provider:`, summary.byProvider);
console.log(`Daily:`, summary.daily);
```

## Production Features

### Circuit Breakers

```javascript
const router = createA3MRouter({
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000
  }
});
```

### Response Caching

RadixAttention-style prefix caching:

```javascript
const router = createA3MRouter({
  cache: {
    ttl_seconds: 3600,
    maxSize: 1000
  }
});
```

### Batch Processing

```javascript
const queries = ["Q1", "Q2", "Q3"];
const results = routeBatch(queries, {
  concurrency: 5,
  same_model: true
});
```

## Results

| Metric | Value |
|--------|-------|
| Weekly Downloads | 872 |
| Daily Average | 320 |
| Test Coverage | 33 tests |
| Providers Supported | 12 |
| Keywords | 139 |
| Integrations | 116 |

## Usage

```bash
npm install adaptive-memory-multi-model-router
```

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Route to optimal provider
const result = await router.route("Write Python to sort an array");
console.log(result.primary_model);  // "groq/llama-3.3-70b"
console.log(result.estimated_cost);   // $0.0004

// Batch processing
const results = router.routeBatch(queries);

// Cost tracking
const summary = router.costTracker.getSummary();
```

## CLI

```bash
npx a3m-router providers      # List providers
npx a3m-router route "query"  # Route query
npx a3m-router benchmark      # Compare providers
npx a3m-router status         # System status
```

## What's Next

1. **More providers**: Adding Together AI, AI21, Cohere
2. **Fine-tuned routing**: Per-user routing preferences
3. **Streaming optimization**: Latency-optimized streaming
4. **Multi-modal**: Image, audio routing

## Links

- NPM: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- GitHub: https://github.com/Das-rebel/a3m-router
- Weekly Downloads: 872+

---

*Have you built LLM routing systems? What approaches worked for you?*
