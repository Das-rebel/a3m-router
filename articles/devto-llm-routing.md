---
title: "Building an LLM Router That Actually Works: 2,775 Downloads in 3 Days, Zero Marketing Budget"
published: false
description: "How we built adaptive-memory-multi-model-router — a production-ready LLM routing library that went from 552 downloads on Day 1 to 1,903 on Day 3 with zero marketing."
tags: llm, ai, routing, javascript, typescript, openai, claude, groq
canonical_url: https://github.com/Das-rebel/adaptive-memory-multi-model-router
---

# Building an LLM Router That Actually Works: 2,775 Downloads in 3 Days, Zero Marketing Budget

Day 1: 552 downloads. Day 2: 320 downloads. We thought it was dead.
Day 3: 1,903 downloads. 245% growth from Day 1. All word-of-mouth.

Here's what we built and what we learned from the launch curve.

## The Problem

Most LLM routing is naive:
- Hardcoded provider selection
- No cost optimization
- No fallback handling
- No caching

## Our Solution: A3M Router

```bash
npm install adaptive-memory-multi-model-router
```

### Key Features

**1. Learned Routing (RouteLLM-style)**
```javascript
const { routeQuery } = require('adaptive-memory-multi-model-router');

const result = routeQuery("Write a Python function to sort an array");
// Routes to cheapest provider that can handle code
```

**2. Generic Provider System**
- 12 providers supported (Groq, Cerebras, Mistral, OpenAI, Anthropic, Google, DeepSeek)
- CLI providers (CommandCode, OpenCode)
- Local providers (Ollama, vLLM, LM Studio)
- User-configurable via `~/.config/a3m-router/providers.json`

**3. Cost Optimization**
```javascript
const { estimateCost } = require('adaptive-memory-multi-model-router');

const cost = estimateCost(1000, 500, 'gpt-4o');
console.log(`Cost: $${cost.toFixed(6)}`);
```

**4. Production Features**
- Circuit breakers
- Automatic retries
- Response caching
- Cost tracking
- Batch processing

## Architecture

```
Query → Feature Extraction → Router → Provider Selection → Execution
         ↓                      ↓              ↓
    Code? Math?          Cost/Quality    Fallback Chain
    Translation?         Tradeoff        Health Checks
```

## The Launch Curve

| Day | Downloads | Notes |
|-----|-----------|-------|
| Day 1 | 552 | Modest. A few early adopters found it. |
| Day 2 | 320 | Thought the launch flopped. Fewer than Day 1. |
| Day 3 | 1,903 | 6x Day 2. 245% growth from Day 1. Word-of-mouth kicked in. |
| **Total** | **2,775** | **Zero marketing budget.** |

Lesson: good tooling spreads on its own timeline. The Day 2 dip was demoralizing, but Day 3 proved that word-of-mouth compounds — it just takes a beat.

## Real-World Usage

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Route automatically selects best provider
const result = await router.route("Explain quantum computing");
console.log(result.primary_model); // groq/llama-3.3-70b-versatile

// Batch processing
const results = router.routeBatch([
  "What is 2+2?",
  "Write Python code",
  "Translate to French"
]);
```

## Performance

- **2,775 downloads in 3 days**
- **1,903 downloads on Day 3 alone** (245% growth from Day 1)
- **Zero marketing budget**
- **33 tests** passing
- **139 keywords** for discoverability
- **116 integrations** supported

## Try It

```bash
npx a3m-router providers
npx a3m-router route "Hello world"
npx a3m-router benchmark
```

## Links

- GitHub: https://github.com/Das-rebel/adaptive-memory-multi-model-router
- NPM: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- Docs: Built into CLI (`npx a3m-router --help`)

---

*What's your LLM routing strategy? Share in the comments!*
