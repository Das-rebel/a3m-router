---
name: tmlpd
description: Research-backed Multi-LLM Router with parallel execution, streaming, caching, token compression (ISON), local provider support (Ollama/vLLM/LM Studio), batch processing. Based on arXiv research: RouteLLM routing, RadixAttention prefix caching, Medusa/EAGLE speculative decoding. Python bindings for LangChain/LlamaIndex/AutoGen/CrewAI. 120+ keywords for LLM/ML discoverability. Use for multi-model comparison, cost optimization, batch processing, local privacy, context compression, adaptive routing.
---

# TMLPD PI Extension

**Research-backed Multi-LLM Router** with advanced optimization features.

## Direct Imports (TypeScript)

```typescript
import {
  createTMLPD,           // Core instance
  HALOOrchestrator,      // Hierarchical orchestration
  EpisodicMemoryStore,    // Learn from past tasks
  // Advanced Routing (RouteLLM-style)
  routeQuery,            // Learned routing decision
  routeBatch,            // Batch routing
  extractQueryFeatures,   // Feature extraction
  MODEL_PROFILES,         // Model cost/quality profiles
  // Prefix Cache (RadixAttention-style)
  PrefixCache,           // 5-10x speedup for shared prompts
  createWarmedCache,     // Pre-warmed cache
  // Speculative Decoding (Medusa/EAGLE)
  SpeculativeDecoder,     // 2-3x faster generation
  estimateSpeedupPotential,
  // Compression
  isonEncode,            // 20-40% token reduction
  truncateMessages,      // Context window management
  // Local providers
  createOllamaProvider,  // Ollama
  createVLLMProvider,    // vLLM
  // Batch processing
  BatchProcessor,        // Priority queuing
  TMLPD_PI_TOOLS         // 13 PI tool definitions
} from "tmlpd-pi";
```

## Direct Imports (Python)

```python
from tmlpd import (
    TMLPDLite,       # Lite client (sync, no deps)
    TMLPDClient,     # Async production client
    TaskType,        # CODING, FAST, PREMIUM, etc.
    quick_process    # One-liner function
)
```

## 13 PI Tools

| Tool | Input | Output |
|------|-------|--------|
| `tmlpd_execute` | `{prompt, models?}` | `{content, model, cost}` |
| `tmlpd_execute_single` | `{prompt, model?}` | `{content, model}` |
| `tmlpd_cost_summary` | `{}` | `{total_cost, by_provider}` |
| `tmlpd_cache_stats` | `{}` | `{hits, misses, hit_rate}` |
| `tmlpd_provider_status` | `{}` | `{ready_providers}` |
| `tmlpd_invalidate_cache` | `{model?}` | `{invalidated}` |
| `tmlpd_get_budget` | `{}` | `{daily, monthly}` |
| `tmlpd_halo_execute` | `{task, max_concurrent?}` | `{success, results}` |
| `tmlpd_episodic_query` | `{task, limit?}` | `EpisodicEntry[]` |
| `tmlpd_count_tokens` | `{text, model?}` | `{tokens}` |
| `tmlpd_compress_context` | `{messages, strategy?}` | `{compressed, ratio}` |
| `tmlpd_local_generate` | `{prompt, runtime, model?}` | `{content, cost:0}` |
| `tmlpd_batch_execute` | `{prompts, concurrency?}` | `BatchResult[]` |

## Research-Backed Features (arXiv)

### RouteLLM-Style Learned Routing (arXiv:2404.06035)

```typescript
// Automatic cost-quality tradeoff routing
const decision = routeQuery('Write a Python async function');
// Returns: { primary_model, fallback_models, confidence, reasoning }

const features = extractQueryFeatures(prompt);
// Extracts: complexity, has_code, has_math, is_multilingual, etc.

// MODEL_PROFILES contains cost/latency/quality for each provider
console.log(MODEL_PROFILES['openai/gpt-4o'].quality_score);  // 0.95
```

| Model | Quality | Latency | Best For |
|-------|---------|---------|----------|
| gpt-4o | 0.95 | 2000ms | reasoning |
| gpt-4o-mini | 0.85 | 500ms | fast |
| claude-3.5-sonnet | 0.96 | 2500ms | creative |
| gemini-2.0-flash | 0.88 | 800ms | multilingual |
| groq/llama-3.3-70b | 0.82 | 400ms | fast/budget |

### RadixAttention-Style Prefix Caching (arXiv:2312.07104)

```typescript
// 5-10x speedup for shared system prompts
const cache = new PrefixCache({ max_entries: 10000 });
cache.warmup([
  "You are a helpful assistant.",
  "You are a coding assistant.",
  "Analyze the following code..."
]);

// Automatic prefix matching
const result = cache.lookup("You are a helpful assistant. Please explain...");
// Returns cached if prefix matches

const stats = cache.getStats();
// { total_entries, hit_rate, memory_estimate_mb }
```

### Medusa/EAGLE Speculative Decoding (arXiv:2401.10774)

```typescript
// 2-3x faster generation with same quality
const decoder = new SpeculativeDecoder();
const result = await decoder.decode(
  prompt,
  fastModelFn,    // Draft model
  slowModelFn,    // Target model
  5               // Max draft tokens
);
// { accepted, rejected, speedup, final_text }

const speedup = estimateSpeedupPotential(100, 200, 50, 200);
// Returns estimated speedup (capped at 3x)
```

## Token Utilities

```typescript
// Count tokens (no API call)
const tokens = countTokens("Your prompt", "claude-3.5-sonnet");

// Estimate cost before execution
const cost = estimateCost(500, 200, "gpt-4o");  // $0.0095

// Find cheapest models for task
const cheap = findCheapestModels("fast", 3);
```

## ISON Compression (20-40% token reduction)

```typescript
// Remove articles, normalize whitespace
const encoded = isonEncode("The quick brown fox jumps over the lazy dog");
// "quick brown fox jumps lazy dog"

// Truncate long conversations
const truncated = truncateMessages(messages, 4000, "smart");
```

## Local LLM Support

```typescript
// Zero cost, privacy-preserving
const ollama = createOllamaProvider("llama-3.3-70b");
const vllm = createVLLMProvider("http://localhost:8000");

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
batch.onProgress((progress, result) => {
  console.log(`Completed: ${progress.completed}/${progress.total}`);
});
await batch.execute(executor);
```

## Python Task Routing

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()
task = lite.classify_task("Write Python async function")
# TaskType.CODING

models = lite.get_optimal_models(task, 3)
# ["codex", "claude-minimax", "claude"]
```

| TaskType | Keywords | Models |
|----------|----------|--------|
| CODING | python, javascript, code | codex, claude-minimax |
| FRONTEND | react, vue, component | codex, claude-minimax |
| CHINESE | 中文, 汉语 | claude-glm, claude-minimax |
| FAST | quick, simple | gemini, claude-haiku |

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

## 120+ Keywords for Discoverability

```
routellm, prefix-caching, radix-attention, speculative-decoding, medusa, eagle,
flashattention, pagedattention, kv-cache-quantization, llmlingua, streamingllm,
tensor-parallelism, continuous-batching, multi-model-orchestration,
multi-agent-debate, self-consistency, adaptive-router, intelligent-router,
context-aware-router, task-aware-router, memory-augmented-llm,
episodic-memory-router, semantic-memory-router, arxiv, research-backed,
icml, neurips, iclr, token-compression, context-compression
```

## npm

**Package:** https://npmjs.com/package/tmlpd-pi  
**Version:** 1.2.0 | **Files:** 94 | **Size:** 543KB unpacked

## Reference

- RouteLLM: arXiv:2404.06035
- RadixAttention: arXiv:2312.07104
- Medusa: arXiv:2401.10774
- FlashAttention: arXiv:2304.05195
- PagedAttention: SOSP 2023