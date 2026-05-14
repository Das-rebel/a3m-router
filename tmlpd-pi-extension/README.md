# TMLPD PI - v1.2.0

> Memory-based Multi-LLM Router with Reddit-informed enhancements
> Based on analysis of r/LocalLLaMA, r/AI_Agents, r/MachineLearning, r/llm

## Reddit Pain Points → TMLPD Solutions

| Reddit Issue | Engagement | TMLPD v1.2.0 Solution |
|--------------|------------|----------------------|
| **Function calling broken** | 🔥🔥🔥 (1957 pts) | `execute_parallel()` with fallback |
| **Token costs in freefall** | 🔥🔥🔥 (354 comments) | `countTokens()`, `estimateCost()` |
| **70% token reduction interest** | 🔥🔥 (ISON format) | `isonEncode()`, `compressText()` |
| **Serving 1B+ tokens/day locally** | 🔥🔥 (KV cache) | `LocalProvider` (Ollama/vLLM/LM Studio) |
| **Throughput optimization** | 🔥🔥 (GPU clusters) | `BatchProcessor` with concurrency |
| **Intelligent failover** | 🔥🔥 (multi-provider) | Auto-fallback chain |
| **Claude Code multi-agent** | 🔥 (815 comments) | `HALOOrchestrator` |

---

## Installation

```bash
npm install tmlpd-pi
```

```bash
# Or use Python (no dependencies)
# Copy python/tmlpd.py to your project
```

---

## Quick Start

```typescript
import { createTMLPD, countTokens, compressText, BatchProcessor } from "tmlpd-pi";

// Basic parallel execution
const tmlpd = createTMLPD();
const result = await tmlpd.executeParallel(
  "Explain quantum entanglement",
  ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"]
);

// Token counting & cost estimation
const tokens = countTokens("Hello world", "gpt-4o");
const cost = estimateCost(100, 50, "gpt-4o");

// ISON compression (20-40% token reduction)
const compressed = isonEncode("The quick brown fox jumps over the lazy dog");
// → "quick brown fox jumps lazy dog"

// Batch processing
const batch = new BatchProcessor({ concurrency: 5 });
batch.add({ prompt: "Task 1", priority: "high" });
batch.add({ prompt: "Task 2", priority: "normal" });
await batch.execute(executor);
```

```python
from tmlpd import TMLPDLite, quick_process

# One-liner
result = quick_process("What is quantum?")

# Lite client with task routing
lite = TMLPDLite()
result = lite.process("Write Python async function")
# Auto-routes to TaskType.CODING → optimal models
```

---

## New Features v1.2.0

### Token Utilities

```typescript
import { countTokens, estimateCost, listModelsByCost, findCheapestModels } from "tmlpd-pi";

// Count tokens
const tokens = countTokens("Your prompt here", "claude-3.5-sonnet");

// Estimate cost before execution
const cost = estimateCost(
  prompt_tokens,  // 500
  completion_tokens,  // 200
  "gpt-4o"  // → $0.0095
);

// List all models by cost
const models = listModelsByCost();
// [{ model: "gemini-2.0-flash", input: 0, output: 0 }, ...]

// Find cheapest for task
const cheap = findCheapestModels("fast", 3);
// ["gemini-2.0-flash", "groq/llama-3.1-8b", ...]
```

### Context Compression (ISON)

```typescript
import { isonEncode, compressText, truncateMessages } from "tmlpd-pi";

// ISON encoding - removes articles, normalizes whitespace
const original = "The quick brown fox jumps over the lazy dog";
const encoded = isonEncode(original);
// "quick brown fox jumps lazy dog" - 33% reduction

// Full compression with stats
const result = compressText(original);
// { original_tokens: 12, compressed_tokens: 8, ratio: 0.67, compressed_text: "..." }

// Truncate conversation to fit context window
const messages = [
  { role: "system", content: "You are helpful" },
  { role: "user", content: "Long conversation..." },
  { role: "assistant", content: "Response..." }
];
const truncated = truncateMessages(messages, 4000, "smart");
// Preserves system, compresses middle, keeps recent
```

### Local LLM Support

```typescript
import { createOllamaProvider, createVLLMProvider, LocalProviderManager } from "tmlpd-pi";

// Ollama (localhost:11434)
const ollama = createOllamaProvider("llama-3.3-70b");
const models = await ollama.listModels();
const result = await ollama.generate("Your prompt");

// vLLM (localhost:8000)
const vllm = createVLLMProvider("http://localhost:8000", "meta-llama/Llama-3.3-70b");

// LM Studio (localhost:1234)
const lmstudio = createLMStudioProvider("llama-3.3-70b");

// Manager for multi-runtime
const manager = new LocalProviderManager();
manager.addProvider("ollama", { runtime: "ollama", default_model: "llama-3.3-70b" });
manager.addProvider("vllm", { runtime: "vllm", endpoint: "http://localhost:8000" });

// Parallel across local runtimes
const localResults = await manager.executeParallel(
  "Your prompt",
  { models: ["ollama/llama-3.3-70b", "vllm/llama-3.3-70b"] }
);
```

### Batch Processing

```typescript
import { BatchProcessor, executeBatch } from "tmlpd-pi";

// Create batch processor
const batch = new BatchProcessor({
  concurrency: 5,
  stop_on_error: false,
  rate_limit: { requests_per_minute: 60 }
});

// Add items with priority
batch.add({ prompt: "Task 1", priority: "high" });
batch.add({ prompt: "Task 2", priority: "normal" });
batch.add({ prompt: "Task 3", priority: "low" });

// Progress callback
batch.onProgress((progress, result) => {
  console.log(`Completed: ${progress.completed}/${progress.total}`);
  if (result) console.log(`  - ${result.id}: ${result.success ? 'OK' : result.error}`);
});

// Execute
const results = await batch.execute(async (item) => {
  return tmlpd.execute(item.prompt);
});

// Simple helper for one-off batches
const simple = await executeBatch(
  [
    { prompt: "Task 1", model: "gpt-4o" },
    { prompt: "Task 2", model: "claude" }
  ],
  async (prompt, model) => tmlpd.execute(prompt, model),
  { concurrency: 3 }
);
```

---

## 13 PI Tools

| Tool | Description |
|------|-------------|
| `tmlpd_execute` | Parallel multi-model execution |
| `tmlpd_execute_single` | Smart routing to optimal model |
| `tmlpd_cost_summary` | Real-time cost tracking |
| `tmlpd_cache_stats` | Cache hit rate & statistics |
| `tmlpd_provider_status` | Provider health monitoring |
| `tmlpd_invalidate_cache` | Clear stale cache |
| `tmlpd_get_budget` | Budget limits & remaining |
| `tmlpd_halo_execute` | HALO orchestration |
| `tmlpd_episodic_query` | Learn from past tasks |
| `tmlpd_count_tokens` | Token counting for estimation |
| `tmlpd_compress_context` | ISON compression |
| `tmlpd_local_generate` | Local LLM (Ollama/vLLM/LM Studio) |
| `tmlpd_batch_execute` | Batch with priority |

---

## Framework Integrations

```python
# LangChain
from langchain.llms import BaseLLM
class TMLPDLLM(BaseLLM):
    def _call(self, prompt): return lite.process(prompt)["content"]

# LlamaIndex
from llama_index.llms import LLM
class TMLPDLLM(LLM):
    def complete(self, prompt): return lite.process(prompt)["content"]

# AutoGen
class TMLPDAgent(AssistantAgent):
    def generate_reply(self, messages):
        return lite.process(messages[-1]["content"])["content"]

# CrewAI
class TMLPDAgent(Agent):
    def execute_task(self, task, context=None):
        return lite.process(task)["content"]
```

---

## Q&A for Reddit Issues

See `qna/TMLPD_QNA.md` for 30 Q&A addressing:
- Parallel processing with rate limits
- Cost tracking and budgets
- Reliability and automatic fallback
- Caching strategies
- Model routing intelligence
- Context and memory management
- Framework integrations

---

## Keywords (100+ for LLM Discovery)

```
memory-based-router, multi-llm-router, adaptive-router, intelligent-router,
context-aware-router, task-aware-router, memory-augmented-llm,
episodic-memory-router, semantic-memory-router, task-memory,
token-compression, context-compression, ison-format, message-truncation,
context-management, local-llm, ollama, vllm, lmstudio, local-model,
privacy-llm, batch-processing, batch-execution, priority-queue,
rate-limiting, token-counting, cost-estimation, cost-prediction,
parallel-execution, multi-provider, fallback-chain, intelligent-failover,
kv-cache, langchain, llamaindex, autogen, crewai, huggingface
```

---

**npm:** https://npmjs.com/package/tmlpd-pi  
**Version:** 1.2.0 | **License:** MIT