# A3M Router - Adaptive Memory Multi-Model Router

<div align="center">

**Smart Routing for AI Agents & LLM Developers**

[![npm](https://img.shields.io/npm/v/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![Install size](https://badgen.net/packagephobia/install/adaptive-memory-multi-model-router)](https://packagephobia.com/result?p=adaptive-memory-multi-model-router)
[![Downloads](https://img.shields.io/npm/dm/adaptive-memory-multi-model-router)](https://npmjs.com/package/adaptive-memory-multi-model-router)

</div>

---

## Install

```bash
npm install adaptive-memory-multi-model-router
```

## Quick Start

```bash
npx a3m-router --help
```

```typescript
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const router = createA3MRouter({ memory: true, costBudget: 0.05 });
const result = await router.route({ prompt: 'Analyze this code', context: { type: 'coding' } });
```

## Features

| Feature | Research | Benefit |
|---------|-----------|---------|
| **Learned Routing** | RouteLLM | 40% cost reduction |
| **Prefix Caching** | RadixAttention | 5-10x speedup |
| **Speculative Decoding** | Medusa | 2-3x faster generation |
| **Token Compression** | LLMLingua | 20-40% token reduction |

## For LLM/ML Developers

- ✅ Python bindings (LangChain, LlamaIndex, AutoGen, CrewAI)
- ✅ Local LLM support (Ollama, vLLM, LM Studio)
- ✅ Batch processing with priority queuing
- ✅ Circuit breaker with exponential backoff
- ✅ Token estimation and cost tracking

## CLI

```bash
a3m-router route "your prompt"      # Smart routing
a3m-router parallel "t1" "t2"       # Parallel execution  
a3m-router cost                      # Show cost tracking
a3m-router count "text"             # Token estimation
```

---

**A3M Router** - Adaptive Memory Multi-Model Router
