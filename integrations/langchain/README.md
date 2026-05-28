# A3M Router — LangChain Integration

Use **A3M Router** as a drop-in LLM provider inside LangChain chains and agents. Route every query to the cheapest capable provider with automatic fallback and optional parallel ensemble execution.

> **This is a community integration. PRs welcome!**

## Installation

```bash
npm install @langchain/core
```

The integration itself is a single TypeScript file. Copy it into your project:

```bash
cp integrations/langchain/a3m_langchain.ts ./src/
```

Or import directly from the package (when published):

```bash
npm install adaptive-memory-multi-model-router
```

```typescript
import { A3MLLM } from 'adaptive-memory-multi-model-router/integrations/langchain';
```

## Quick Start

```typescript
import { A3MLLM } from './a3m_langchain';

const llm = new A3MLLM({
  providers: {
    groq: {
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      models: ['llama-3.3-70b-versatile'],
      tier: 'cheap',
    },
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4o-mini'],
      tier: 'premium',
    },
  },
  routingStrategy: 'cheapest', // auto-pick cheapest
  fallbackEnabled: true,       // fall back on failure
});

const response = await llm.invoke('What is the capital of France?');
console.log(response);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `providers` | `Record<string, A3MProviderConfig>` | (required) | Provider configurations |
| `routingStrategy` | `'cheapest' \| 'fastest' \| 'priority' \| 'random'` | `'cheapest'` | Provider selection strategy |
| `defaultModel` | `string` | `''` | Fallback model name |
| `temperature` | `number` | `0.7` | LLM temperature |
| `maxTokens` | `number` | `4096` | Max output tokens |
| `timeout` | `number` | `60000` | Request timeout (ms) |
| `fallbackEnabled` | `boolean` | `true` | Auto-fallback on failure |
| `priorityOrder` | `string[]` | `[]` | Provider priority order |
| `onRoute` | `function` | — | Route decision callback |
| `onError` | `function` | — | Error callback |

## Provider Config Format

```typescript
interface A3MProviderConfig {
  name: string;           // Human-readable name
  baseUrl: string;        // API endpoint URL
  apiKey?: string;        // API key
  models: string[];       // Available models
  tier: 'free' | 'cheap' | 'mid' | 'premium' | 'enterprise';
  cost?: { input: number; output: number };  // $ per 1M tokens
  format?: 'openai' | 'anthropic' | 'google' | 'cohere';
  headers?: Record<string, string>;  // Extra HTTP headers
  maxTokens?: number;
}
```

## Routing Strategies

- **`cheapest`** — Picks the provider with the lowest combined input+output cost per 1M tokens.
- **`fastest`** — Picks providers in registration order (register fast ones first).
- **`priority`** — Uses explicit `priorityOrder` array.
- **`random`** — Random provider selection (load balancing).

## Routing Metadata

Every `invokeWithMetadata()` call returns A3M routing details:

```typescript
{
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  latencyMs: 342,
  costUsd: 0.00012,
  tier: 'cheap',
  tokensUsed: { input: 45, output: 120, total: 165 },
  ensemble: false
}
```

## Ensemble Mode

Run multiple providers in parallel and merge results:

```typescript
const result = await llm.ensembleInvoke('Explain quantum computing', {
  ensemble: 'longest', // 'first' | 'longest' | 'concat'
});

console.log(result.text);
console.log('Used providers:', result.metadata.ensembleProviders);
```

**Ensemble strategies:**

| Strategy | Behavior |
|----------|----------|
| `first` | Return first response received (lowest latency) |
| `longest` | Return the most verbose response |
| `concat` | Concatenate all responses with provider headers |

## LangChain Chain Integration

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const prompt = PromptTemplate.fromTemplate(
  'Answer as a {role}: {question}',
);

const chain = prompt
  .pipe(llm as any)           // A3MLLM works as a runnable
  .pipe(new StringOutputParser());

const response = await chain.invoke({
  role: 'physicist',
  question: 'Why is the sky blue?',
});
```

## Factory Functions

```typescript
// Single provider
const groq = createA3MProvider('groq', {
  apiKey: process.env.GROQ_API_KEY,
});

// Auto-router across providers
const router = createA3MRouter({
  groq: { apiKey: process.env.GROQ_API_KEY },
  openai: { apiKey: process.env.OPENAI_API_KEY },
  nvidia: { apiKey: process.env.NVIDIA_API_KEY },
});

const { text, metadata } = await router.invokeWithMetadata('Hello!');
console.log('Routed to:', metadata.provider, '| Cost: $' + metadata.costUsd);
```

## Cost Comparison

| Scenario | Cost per 1K queries | vs All-Premium |
|----------|-------------------|----------------|
| **A3M Router** (cheapest routing) | **~$0.30** | **~82% less** |
| All-GPT-4o | $2.50 | — |
| All-Claude-3 | $3.00 | — |
| All-Mistral-Large | $0.60 | — |

Routing strategy routes simple queries (summaries, facts) to free/cheap providers and only uses premium providers for complex reasoning. Result: typical cost savings of **60-82%** with negligible quality difference on most queries.

## Built-in Default Providers

The integration includes 12 built-in provider configs — just add your API keys:

`groq`, `openai`, `anthropic`, `deepseek`, `google`, `cerebras`, `nvidia`, `deepinfra`, `together`, `mistral`

```typescript
import { A3MLLM, A3M_DEFAULT_PROVIDERS } from './a3m_langchain';

const llm = new A3MLLM({
  providers: {
    groq: { ...A3M_DEFAULT_PROVIDERS.groq, apiKey: process.env.GROQ_API_KEY },
  },
});
```

## Files

| File | Purpose |
|------|---------|
| `a3m_langchain.ts` | Core integration — `A3MLLM` class, providers, routing, ensemble |
| `example.ts` | Runnable examples for all features |
| `README.md` | This file |

## Requirements

- Node.js 18+
- `@langchain/core` ≥ 0.1.0 (peer dependency)
- At least one LLM provider API key

## License

MIT — Same as A3M Router.
