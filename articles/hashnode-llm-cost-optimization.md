---
title: "How I Reduced LLM API Costs by 70% with Smart Routing"
domain: hashnode.com
tags: llm, ai, cost-optimization, javascript, openai, groq
---

# How I Reduced LLM API Costs by 70% with Smart Routing

After our startup's OpenAI bill hit $2,400 in one month, I knew we needed a better solution. Here's how we built an intelligent routing system that cut costs by 70% while maintaining quality.

## The Problem

We were using GPT-4 for everything:
- Simple Q&A → GPT-4 ($0.03 per query)
- Code generation → GPT-4 ($0.05 per query)
- Text summarization → GPT-4 ($0.02 per query)

**Monthly cost: $2,400+**

## The Insight

Not every query needs GPT-4. Simple questions work fine with cheaper models. Code generation works great with Groq's Llama. Summarization can use Mistral's small model.

## The Solution: A3M Router

We built (and open-sourced) `adaptive-memory-multi-model-router` - a learned routing system that automatically selects the optimal provider.

### How It Works

```javascript
const { routeQuery } = require('adaptive-memory-multi-model-router');

// Simple query → cheapest provider (free)
routeQuery("What is 2+2?");
// → commandcode/taste-1 ($0.00)

// Code query → fast, code-capable provider
routeQuery("Write Python to reverse a string");
// → groq/llama-3.3-70b ($0.0004)

// Complex reasoning → high-quality provider
routeQuery("Explain quantum entanglement");
// → mistral/mistral-large ($0.002)
```

### The Algorithm

1. **Feature Extraction**: Analyze the query
   - Code patterns? (function, class, import)
   - Math notation? (∫, ∑, √)
   - Language? (multilingual detection)
   - Complexity? (length + patterns)

2. **Model Scoring**: Each provider has a profile
   ```javascript
   {
     cost_per_1k_input: 0.59,
     cost_per_1k_output: 0.79,
     latency_ms: 400,
     quality_score: 0.82,
     strengths: ["fast", "coding"]
   }
   ```

3. **Smart Selection**: Weight quality vs cost based on complexity
   - Simple queries (< 0.5 complexity) → 70% cost weight
   - Complex queries (> 0.6 complexity) → 70% quality weight

## Results

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Monthly Cost | $2,400 | $720 | **70%** |
| Avg Cost/Query | $0.03 | $0.009 | **70%** |
| Response Time | 2.1s | 0.8s | **62%** |
| Quality Score | 100% | 94% | **6%** |

## Implementation

```bash
npm install adaptive-memory-multi-model-router
```

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Automatic routing
const result = await router.route(userQuery);
const response = await callProvider(result.primary_model, userQuery);
```

## Supported Providers

- **Free**: CommandCode, OpenCode
- **Fast/Cheap**: Groq ($0.59/1M tokens), Cerebras ($0.60/1M)
- **Quality**: Mistral, OpenAI, Anthropic
- **Local**: Ollama, vLLM (free!)

## Key Features

✅ **Learned Routing** - RouteLLM-style optimization
✅ **Cost Tracking** - Real-time spend monitoring
✅ **Fallback** - Automatic retry with backup providers
✅ **Batch Processing** - Parallel execution
✅ **Caching** - RadixAttention-style prefix caching
✅ **CLI Tools** - 15 commands for operations

## Try It

```bash
npx a3m-router route "Your query here"
npx a3m-router benchmark
```

## Links

- NPM: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- GitHub: https://github.com/Das-rebel/a3m-router
- Weekly Downloads: 872+ and growing

---

*What's your LLM cost optimization strategy? Share in the comments!*
