---
name: tmlpd
description: Memory-based Multi-LLM Router with parallel execution, streaming, caching, cost tracking, token compression (ISON), local provider support (Ollama/vLLM/LM Studio), batch processing. Python bindings for LangChain/LlamaIndex/AutoGen/CrewAI. Based on Reddit LLM pain points: 70% token compression, KV cache, privacy-preserving local execution, intelligent failover. Use for multi-model comparison, cost optimization, batch processing, local privacy, context compression.
---

# TMLPD PI Extension

**Memory-based Multi-LLM Router** with 13 PI tools for parallel execution, compression, and local providers.

## Direct Imports (TypeScript)

```typescript
import {
  createTMLPD,           // Core instance
  HALOOrchestrator,      // Hierarchical orchestration
  EpisodicMemoryStore,    // Learn from past tasks
  countTokens,           // Token counting
  estimateCost,          // Cost estimation
  isonEncode,            // 20-40% token reduction
  truncateMessages,      // Context window management
  createOllamaProvider,  // Local Ollama
  createVLLMProvider,    // Local vLLM
  BatchProcessor,        // Batch with priority
  TMLPD_PI_TOOLS         // 13 PI tool definitions
} from "tmlpd-pi";
```

## Direct Imports (Python)

```python
from tmlpd import (
    TMLPDLite,       # Lite client (sync, no deps)
    TMLPDClient,     # Async production client
    TMLPDConfig,      # Configuration
    TaskType,         # Enum: CODING, FAST, PREMIUM, etc.
    quick_process     # One-liner function
)
```

## 13 PI Tools

| Tool | Input | Output | Use Case |
|------|-------|--------|----------|
| `tmlpd_execute` | `{prompt, models?, streaming?}` | `{content, model, cost, cached}` | Parallel multi-model |
| `tmlpd_execute_single` | `{prompt, model?}` | `{content, model, cost}` | Smart routing |
| `tmlpd_cost_summary` | `{}` | `{total_cost, by_provider, daily}` | Cost monitoring |
| `tmlpd_cache_stats` | `{}` | `{hits, misses, size, hit_rate}` | Cache optimization |
| `tmlpd_provider_status` | `{}` | `{ready_providers, providers}` | Debug providers |
| `tmlpd_invalidate_cache` | `{model?}` | `{invalidated}` | Clear stale cache |
| `tmlpd_get_budget` | `{}` | `{daily, monthly, per_model}` | Budget enforcement |
| `tmlpd_halo_execute` | `{task, max_concurrent?, enable_mcts?}` | `{success, results, strategy}` | Complex orchestration |
| `tmlpd_episodic_query` | `{task_description, limit?}` | `EpisodicEntry[]` | Learn from history |
| `tmlpd_count_tokens` | `{text, model?}` | `{tokens}` | Pre-execution cost check |
| `tmlpd_compress_context` | `{messages, strategy?, max_tokens?}` | `{compressed, ratio}` | 20-40% token reduction |
| `tmlpd_local_generate` | `{prompt, runtime, model?}` | `{content, model, cost:0}` | Privacy-preserving |
| `tmlpd_batch_execute` | `{prompts, concurrency?, model?}` | `BatchResult[]` | Throughput optimization |

## Token Utilities

```typescript
// Count tokens for any model
const tokens = countTokens("Your prompt", "claude-3.5-sonnet");

// Estimate cost before execution
const cost = estimateCost(500, 200, "gpt-4o");  // $0.0095

// Find cheapest models for task
const cheap = findCheapestModels("fast", 3);
// ["gemini-2.0-flash", "groq/llama-3.1-8b", ...]

// List all models sorted by cost
const models = listModelsByCost();
```

## Context Compression (ISON)

```typescript
// ISON encoding - removes articles, normalizes whitespace
const encoded = isonEncode("The quick brown fox jumps over the lazy dog");
// "quick brown fox jumps lazy dog" - ~33% reduction

// Truncate long conversations to fit context
const truncated = truncateMessages(messages, 4000, "smart");
// Preserves system + recent, compresses middle
```

## Local LLM Support

```typescript
// Ollama (free, privacy-preserving)
const ollama = createOllamaProvider("llama-3.3-70b");
const result = await ollama.generate("Your prompt");
// $0 cost, no data leaves machine

// vLLM for GPU servers
const vllm = createVLLMProvider("http://localhost:8000", "meta-llama/Llama-3.3-70b");

// LM Studio
const lm = createLMStudioProvider("llama-3.3-70b");

// Parallel across local + cloud
const results = await manager.executeParallel("Prompt", {
  models: ["ollama/llama-3.3-70b", "openai/gpt-4o"]
});
```

## Batch Processing

```typescript
const batch = new BatchProcessor({ concurrency: 5 });
batch.add({ prompt: "Task 1", priority: "high" });
batch.add({ prompt: "Task 2", priority: "normal" });
batch.add({ prompt: "Task 3", priority: "low" });

batch.onProgress((progress, result) => {
  console.log(`Completed: ${progress.completed}/${progress.total}`);
});

const results = await batch.execute(executor);
```

## Python Task Routing

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()
task_type = lite.classify_task("Write Python async function")
# TaskType.CODING

models = lite.get_optimal_models(task_type, 3)
# ["codex", "claude-minimax", "claude"]
```

| TaskType | Keywords | Models |
|----------|----------|--------|
| CODING | python, javascript, code | codex, claude-minimax |
| FRONTEND | react, vue, component | codex, claude-minimax |
| CHINESE | 中文, 汉语 | claude-glm, claude-minimax |
| FAST | quick, simple | gemini, claude-haiku |
| PREMIUM | advanced, complex | claude-opus, gemini-pro |

## Framework Integrations

```python
# LangChain
class TMLPDLLM(BaseLLM):
    def _call(self, prompt): return lite.process(prompt)["content"]

# LlamaIndex
class TMLPDLLM(LLM):
    def complete(self, prompt): return lite.process(prompt)["content"]

# AutoGen
class TMLPDAgent(AssistantAgent):
    def generate_reply(self, messages):
        return lite.process(messages[-1]["content"])["content"]
```

## Reddit Pain Points Addressed

| Issue | Solution |
|-------|----------|
| Function calling failures | Parallel execution with automatic fallback |
| Token cost obsession | `countTokens()`, `estimateCost()` pre-execution |
| 70% token reduction | ISON encoding, `truncateMessages()` |
| 1B+ tokens/day local | Ollama/vLLM/LM Studio providers |
| Throughput optimization | `BatchProcessor` with concurrency control |
| Intelligent failover | Provider health monitoring + auto-switch |
| Multi-agent orchestration | `HALOOrchestrator` with MCTS |

## Reference

**Package:** [npmjs.com/package/tmlpd-pi](https://npmjs.com/package/tmlpd-pi)  
**Repository:** [github.com/Das-rebel/tmlpd-skill](https://github.com/Das-rebel/tmlpd-skill)  
**Q&A:** See `qna/TMLPD_QNA.md` for 30 common issues with solutions