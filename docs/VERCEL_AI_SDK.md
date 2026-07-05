# Vercel AI SDK Integration for A3M Router

A3M Router integrates seamlessly with Vercel AI SDK for streaming responses and AI gateway deployments.

## Quick Start

### 1. Install Dependencies

```bash
npm install ai @ai-sdk/openai
```

### 2. Configure A3M Router

```typescript
import { createAI } from 'ai';
import { openai } from '@ai-sdk/openai';

// Configure OpenAI SDK to use A3M Router
const a3m = openai({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.A3M_ROUTER_URL || 'http://localhost:8787/v1',
});
```

### 3. Use with AI SDK Stream

```typescript
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: a3m('auto'),  // A3M routes automatically
    system: 'You are a helpful assistant.',
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Complete Example with Vercel Edge Functions

### app/api/chat/route.ts

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('auto', {
      // Point to A3M Router
      baseURL: process.env.A3M_ROUTER_URL || 'http://localhost:8787/v1',
    }),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### app/page.tsx

```typescript
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex-1 overflow-auto">
        {messages.map(m => (
          <div key={m.id} className="mb-4">
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything..."
          className="flex-1 p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Send
        </button>
      </form>
    </div>
  );
}
```

## A3M Router with Vercel AI SDK Features

### Streaming Responses

```typescript
const result = streamText({
  model: openai('auto', { baseURL: 'http://localhost:8787/v1' }),
  messages,
});

// Stream to client
return new Response(result.fullStream, {
  headers: { 'Content-Type': 'text/plain' },
});
```

### Cost Tracking with Vercel Analytics

```typescript
import { generateText, calculateCost } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await generateText({
    model: openai('auto', { baseURL: 'http://localhost:8787/v1' }),
    messages,
    onFinish: (result) => {
      // Log cost for analytics
      const cost = calculateCost(result.usage);
      console.log(`Query cost: $${cost}`);
    },
  });

  return Response.json({ text: result.text });
}
```

### Multi-Provider Routing

A3M automatically routes to the best provider:

```typescript
// A3M evaluates:
// - Groq (free tier) for simple queries
// - DeepSeek (cheap) for reasoning
// - GPT-4o (premium) for complex tasks

const result = await generateText({
  model: openai('auto', { baseURL: 'http://localhost:8787/v1' }),
  messages,
});
```

## Deployment Options

### Option 1: Self-Hosted (Recommended for Cost)

```bash
# Run A3M Router yourself
npx a3m-router serve

# Point Vercel to your A3M instance
A3M_ROUTER_URL=https://your-a3m-instance.com
```

### Option 2: Deploy A3M to Vercel

Create `api/a3m-proxy.ts`:

```typescript
import { createRoute } from 'ai';

export const { handleStreamRequest, handleNonStreamRequest } = createRoute({
  model: openai('auto', {
    baseURL: process.env.A3M_ROUTER_URL,
  }),
});
```

## Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-...           # Your API key (A3M passes through)
A3M_ROUTER_URL=http://localhost:8787/v1  # A3M Router endpoint
```

## Benefits

| Feature | Without A3M | With A3M |
|---------|-------------|----------|
| Model | Fixed (GPT-4o) | Auto-selected |
| Cost/1K | $15-60 | $0.0768 |
| Latency | 2-5s | <1s routing |
| Providers | 1 | 47+ |

## Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/)
- [A3M Router GitHub](https://github.com/Das-rebel/a3m-router)
- [RouterArena Benchmark](https://arxiv.org/abs/2510.00202)
