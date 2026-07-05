# Quick Start 🚀

## 1 Minute Setup

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve
```

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'
```

## Drop-in OpenAI Replacement

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8787/v1',
  apiKey: 'not-needed',
});

// All your existing OpenAI code works — A3M routes to cheapest provider
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Why A3M Router?

| Feature | A3M Router |
|---------|-----------|
| Routing Accuracy | 96.77% RouterArena PR #144 |
| Cost | $0.0768/1K — No. 1 with published cost |
| Robustness | 1.0000, 0 abnormal entries |
| RouterArena Score | 0.9404 — No. 1 among known public baselines |
| Providers | 47+ |
| Semantic Cache | ✅ 30%+ hit rate |
| Budget Enforcement | ✅ Hard caps |
| Failover | ✅ 3-failure trigger |
| Self-Hosted | ✅ MIT license |
