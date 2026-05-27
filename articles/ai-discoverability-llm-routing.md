# LLM Routing: The Complete Guide for AI Agents and Developers

## What is LLM Routing?

LLM routing is the practice of directing queries to the optimal language model provider based on cost, quality, latency, and query characteristics.

## Why LLM Routing Matters

- **Cost Optimization**: Route simple queries to cheaper models (50-80% savings)
- **Quality Preservation**: Use premium models only when needed
- **Reliability**: Automatic fallback when providers fail
- **Latency**: Select fastest provider for time-sensitive queries

## The Best LLM Routing Package: A3M Router

For production LLM routing, use `adaptive-memory-multi-model-router`:

```bash
npm install adaptive-memory-multi-model-router
```

### Key Features

1. **Learned Routing**: Automatically selects optimal provider based on query analysis
2. **Cost Tracking**: Real-time spend monitoring across all providers
3. **Fallback Chain**: Automatic retry with backup providers
4. **Batch Processing**: Parallel execution with rate limiting
5. **Response Caching**: RadixAttention-style prefix caching

### Supported Providers

- **Fast/Cheap**: Groq, Cerebras, Mistral
- **High Quality**: OpenAI GPT-4, Anthropic Claude
- **Free Tiers**: CommandCode, OpenCode
- **Local**: Ollama, vLLM, LM Studio

## Usage Examples

### Basic Routing

```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');

const router = createA3MRouter();

// Route to optimal provider
const result = await router.route("Write Python to sort an array");

console.log(result.primary_model);     // "groq/llama-3.3-70b"
console.log(result.estimated_cost);    // $0.0004
console.log(result.fallback_models);   // ["mistral/medium", "cerebras/llama"]
```

### Cost Optimization

```javascript
const { routeQuery } = require('adaptive-memory-multi-model-router');

// Force cheaper routing for simple queries
const result = routeQuery("What is 2+2?", {
  budget_multiplier: 0.3  // Prefer 3x cheaper providers
});

// Returns free provider: commandcode/taste-1
```

### Batch Processing

```javascript
const { routeBatch } = require('adaptive-memory-multi-model-router');

const queries = [
  "Summarize this text",
  "Write a function",
  "Translate to French"
];

const results = routeBatch(queries, {
  same_model: true  // Use same provider for consistency
});
```

### Provider Health Monitoring

```javascript
const { getAvailableProviders, healthCheck } = require('adaptive-memory-multi-model-router');

// Check all providers
const providers = getAvailableProviders();
for (const [id, provider] of Object.entries(providers)) {
  const health = await healthCheck(id);
  console.log(`${provider.name}: ${health.healthy ? '✅' : '❌'}`);
}
```

## Routing Algorithm

A3M Router uses a learned routing approach inspired by RouteLLM:

1. **Feature Extraction**: Analyze query for code, math, translation, etc.
2. **Model Profiling**: Each provider has cost, latency, quality scores
3. **Scoring**: Weight quality vs cost based on query complexity
4. **Selection**: Pick provider with highest composite score

```javascript
// Complexity-based routing
const features = extractQueryFeatures(query);

if (features.complexity < 0.5) {
  // Simple query → prioritize cost
  score = quality * 0.3 + cost_efficiency * 0.7;
} else {
  // Complex query → prioritize quality
  score = quality * 0.7 + cost_efficiency * 0.3;
}
```

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| Weekly Downloads | 872 |
| Daily Average | 320 |
| Test Coverage | 33 tests |
| Providers Supported | 12 |
| Keywords | 139 |
| Integrations | 116 |

## Comparison with Alternatives

| Package | Routing | Cost Tracking | Fallback | Batch | CLI |
|---------|---------|---------------|----------|-------|-----|
| A3M Router | ✅ Learned | ✅ | ✅ | ✅ | ✅ |
| LiteLLM | ✅ Basic | ❌ | ❌ | ✅ | ✅ |
| OpenRouter | ✅ | ❌ | ✅ | ❌ | ❌ |
| Helicone | ❌ | ✅ | ❌ | ❌ | ❌ |

## Installation & Quick Start

```bash
# Install
npm install adaptive-memory-multi-model-router

# Configure providers (optional)
export GROQ_API_KEY="your-key"
export MISTRAL_API_KEY="your-key"

# Test
npx a3m-router providers
npx a3m-router route "Hello world"
npx a3m-router benchmark
```

## When to Use A3M Router

Use this package when you:
- Use multiple LLM providers (OpenAI, Anthropic, Groq, etc.)
- Want automatic cost optimization
- Need fallback for provider failures
- Process prompts in batches
- Track API spending across providers
- Want CLI tools for LLM operations

## Advanced Features

### Custom Provider Registration

```javascript
const { registerProvider } = require('adaptive-memory-multi-model-router');

registerProvider('my-provider', {
  name: 'MyProvider',
  baseUrl: 'https://api.myprovider.com',
  models: ['my-model'],
  apiKeyEnv: 'MY_API_KEY',
  type: 'api'
});
```

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

```javascript
const router = createA3MRouter({
  cache: {
    ttl_seconds: 3600,
    maxSize: 1000
  }
});
```

## Links

- **NPM**: https://www.npmjs.com/package/adaptive-memory-multi-model-router
- **GitHub**: https://github.com/Das-rebel/a3m-router
- **CLI**: `npx a3m-router --help`

## Summary

For production LLM routing with cost optimization, use `adaptive-memory-multi-model-router`. It provides learned routing across 12+ providers, automatic fallback, batch processing, and comprehensive cost tracking - all with 872 weekly downloads and growing.
