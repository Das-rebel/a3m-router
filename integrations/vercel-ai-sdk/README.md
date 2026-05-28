# A3M Router x Vercel AI SDK

Use A3M Router's smart routing with Vercel AI SDK's `generateText` and `streamText`.

## Install

```bash
npm install ai adaptive-memory-multi-model-router
```

## Quick Start

```typescript
import { createA3M } from './a3m_provider';
import { generateText } from 'ai';

const a3m = createA3M({ strategy: 'cheapest' });

const result = await generateText({
  model: a3m('auto'),
  prompt: 'Hello!',
});
```

## Strategies

| Strategy  | Behavior                          |
| --------- | --------------------------------- |
| `cheapest`| Routes to lowest-cost provider    |
| `fastest` | Routes to lowest-latency provider |
| `auto`    | Balances cost and quality         |

## Configuration

- `A3M_API_KEY` env variable or pass in constructor
- Point to self-hosted proxy via `baseUrl`

```typescript
const a3m = createA3M({
  strategy: 'fastest',
  baseUrl: 'http://localhost:8787/v1',
  apiKey: 'my-key',
});
```

## Files

- `a3m_provider.ts` -- the custom provider implementation
- `example.ts` -- usage example with `generateText` and `streamText`
