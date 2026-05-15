# TMLPD PI - Q&A for Common LLM Issues

> Comprehensive answers to frequent LLM parallel processing problems.
> Each Q&A maps to a TMLPD PI feature or capability.

---

## Table of Contents

1. [Parallel Processing Issues](#1-parallel-processing-issues)
2. [Cost & Budget Issues](#2-cost--budget-issues)
3. [Reliability & Fallback Issues](#3-reliability--fallback-issues)
4. [Caching Issues](#4-caching-issues)
5. [Model Routing Issues](#5-model-routing-issues)
6. [Context & Memory Issues](#6-context--memory-issues)
7. [Framework Integration Issues](#7-framework-integration-issues)
8. [Future Capabilities](#8-future-capabilities)

---

## 1. Parallel Processing Issues

### Q1: "How do I run multiple LLM providers in parallel?"

```python
from tmlpd import TMLPDClient
import asyncio

async def parallel_example():
    client = TMLPDClient()
    
    # Execute across 3 providers simultaneously
    result = await client.execute_parallel(
        prompt="Explain quantum entanglement",
        models=["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash"]
    )
    
    print(f"Got {result.successful_models}/{result.total_models} responses")
    for resp in result.responses:
        print(f"  {resp.provider}: {resp.content[:50]}...")
```

**TMLPD Feature:** `execute_parallel()` with automatic provider coordination

---

### Q2: "How can I compare responses from different models?"

```python
# Compare responses side-by-side
result = await client.execute_parallel(
    prompt="Write a Python async decorator with retry logic",
    models=["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "codex/codex"]
)

for r in result.responses:
    print(f"\n=== {r.model} ({r.provider}) - ${r.cost:.4f} ===")
    print(r.content[:500])
```

**TMLPD Feature:** Multi-model comparison with cost/metadata tracking

---

### Q3: "How do I limit concurrent requests to avoid rate limits?"

```typescript
const tmlpd = createTMLPD({
  maxConcurrent: 3  // Limit parallel executions
});

// HALO orchestration with concurrency control
const halo = new HALOOrchestrator({
  maxConcurrent: 3,
  enableMCTS: true
});
```

**TMLPD Feature:** `maxConcurrent` config + HALO concurrency management

---

### Q4: "How do I handle streaming responses from multiple models?"

```typescript
// Streaming parallel execution
const results = await tmlpd.executeParallel(
    prompt="Write a long technical explanation",
    models=["gpt-4o", "claude"],
    streaming: true
);

// Results stream in as they arrive
for await (const chunk of results.stream) {
    console.log(`${chunk.model}: ${chunk.delta}`);
}
```

**TMLPD Feature:** Built-in streaming support per provider

---

## 2. Cost & Budget Issues

### Q5: "How do I track LLM costs in real-time?"

```python
# Real-time cost tracking
summary = await client.get_cost_summary()

print(f"Total spent: ${summary.total_cost:.4f}")
print(f"By provider: {summary.by_provider}")
print(f"Daily: {summary.daily_costs}")
print(f"Requests: {summary.request_count}")
print(f"Avg cost: ${summary.average_cost_per_request:.6f}")
```

**TMLPD Feature:** `getCostSummary()` with provider/daily breakdown

---

### Q6: "How do I set daily/monthly budgets?"

```typescript
const tmlpd = createTMLPD({
  budget: {
    daily_limit: 10.00,    // $10/day max
    monthly_limit: 100.00  // $100/month max
  }
});

// Check budget anytime
const budget = await tmlpd.getBudget();
// { daily: { used: 2.50, limit: 10.00, remaining: 7.50 }, ... }
```

**TMLPD Feature:** Budget limits + `getBudget()` monitoring

---

### Q7: "How do I route to cheaper models for simple tasks?"

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()

# Auto-classify and route optimally
prompt = "What is 2+2?"
task_type = lite.classify_task(prompt)  # TaskType.FAST

# FAST tasks route to: gemini, claude-haiku, codex
models = lite.get_optimal_models(task_type, 2)

# Use cheapest for simple tasks
result = await client.execute(prompt, model=models[0])
# Routes to gemini-flash (~$0.0001) instead of gpt-4o (~$0.01)
```

**TMLPD Feature:** Task classification → optimal model routing

---

### Q8: "How do I avoid overspending on failed requests?"

```python
# Circuit breaker prevents cascade failures
config = TMLPDConfig(
    retry_max_attempts=3,
    retry_base_delay_ms=500,
    retry_jitter=0.3,  # Random jitter prevents thundering herd
    max_concurrent=5
)

# Failed requests don't count against budget during circuit break
summary = await client.get_cost_summary()
print(f"Failed requests cost: ${summary.failed_request_cost}")
```

**TMLPD Feature:** Circuit breakers + retry cost control

---

## 3. Reliability & Fallback Issues

### Q9: "How do I handle provider outages gracefully?"

```typescript
// Automatic fallback when primary fails
const result = await tmlpd.executeParallel(
    prompt="Critical task - need response",
    models: ["anthropic/claude-3.5-sonnet",  // Primary
             "openai/gpt-4o",                  // Fallback 1
             "google/gemini-2.0-flash"]        // Fallback 2
);

// If claude fails, gpt-4o succeeds automatically
console.log(`Success: ${result.successful_models > 0}`);
```

**TMLPD Feature:** Automatic fallback chain, first-success wins

---

### Q10: "How do I implement retry with exponential backoff?"

```typescript
const tmlpd = createTMLPD({
  retry: {
    max_attempts: 3,
    base_delay_ms: 500,      // Start at 500ms
    max_delay_ms: 30000,     // Cap at 30s
    jitter: 0.3              // ±30% randomization
  }
});

// Jitter: 500, ~650, ~1200ms (varies to prevent thundering herd)
```

**TMLPD Feature:** Configurable exponential backoff with jitter

---

### Q11: "How do I detect and isolate failing providers?"

```typescript
// Provider status check
const status = await tmlpd.getProviderStatus();

console.log(status.ready_providers);  // ["openai", "anthropic", "google"]
console.log(status.providers["openai"].failures);  // 0
console.log(status.providers["anthropic"].latency_ms);  // 450

// Automatically routes around failures
```

**TMLPD Feature:** Provider health monitoring + automatic isolation

---

### Q12: "How do I ensure at least one response succeeds?"

```typescript
// Guaranteed delivery with fallback chain
const result = await tmlpd.executeParallel(
    prompt="Must get response",
    models: ["premium-model-1", "premium-model-2", "budget-model"],
    fallback_enabled: true
);

// result.responses guaranteed to have at least one success
if (result.successful_models === 0) {
    throw new Error("All providers failed - escalate");
}
```

**TMLPD Feature:** At-least-one-success guarantee

---

## 4. Caching Issues

### Q13: "How do I cache LLM responses to save money?"

```python
# Enable caching (enabled by default)
result1 = lite.process("What is Python?", use_cache=True)
# First call - cache miss, real API call

result2 = lite.process("What is Python?", use_cache=True)
# Second call - cache hit, instant, $0
print(f"Cached: {result2['cached']}")  # True
```

**TMLPD Feature:** LRU cache with SHA-256 key generation

---

### Q14: "How do I invalidate stale cache entries?"

```typescript
// Invalidate specific model cache
await tmlpd.invalidateCache("gpt-4o");

// Invalidate all cache
await tmlpd.invalidateCache();  // Clears everything

// Get cache stats
const stats = await tmlpd.getCacheStats();
// { hits: 42, misses: 10, size: 25, hit_rate: 0.808 }
```

**TMLPD Feature:** Selective + full cache invalidation

---

### Q15: "How do I cache based on semantic similarity, not exact match?"

```typescript
// Semantic caching via episodic memory
const memory = new EpisodicMemoryStore();

memory.store({
    task: { description: "Explain quantum physics", type: "explanation" },
    result: { success: true, output: "Quantum physics is...", cost: 0.02 },
    agent: { id: "agent-1", model: "gpt-4o", provider: "openai" },
    metadata: { tokens: 500 },
    importance: 0.8
});

// Later query with similar intent
const similar = memory.getSimilarTasks("What is quantum mechanics?", 3);
// Returns tasks with semantic keyword overlap
```

**TMLPD Feature:** EpisodicMemoryStore for semantic/keyword caching

---

### Q16: "How do I set cache TTL for different content types?"

```typescript
const tmlpd = createTMLPD({
  cache: {
    ttl_seconds: 3600,        // 1 hour default
    max_entries: 1000        // LRU eviction
  }
});

// Factual answers: short TTL (15 min)
// General explanations: medium TTL (1 hour)  
// Documentation: long TTL (24 hours)
```

**TMLPD Feature:** Configurable TTL per request type

---

## 5. Model Routing Issues

### Q17: "How do I automatically route tasks to optimal models?"

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()

# Task → Model routing (built-in intelligence)
routing_table = {
    # CODING tasks
    "Write a Python async function": TaskType.CODING,
    "Debug this JavaScript": TaskType.CODING,
    # FRONTEND tasks  
    "Build a React component": TaskType.FRONTEND,
    "Style this CSS": TaskType.FRONTEND,
    # FAST tasks (budget)
    "What is 2+2?": TaskType.FAST,
    "Quick translation": TaskType.FAST,
    # PREMIUM tasks
    "Design system architecture": TaskType.PREMIUM,
}

prompt = "Write a Python decorator with retry"
task = lite.classify_task(prompt)  # TaskType.CODING
models = lite.get_optimal_models(task, 3)  # ["codex", "claude-minimax", "claude"]
```

**TMLPD Feature:** Automatic task classification + model routing

---

### Q18: "How do I use different models for different parts of a task?"

```python
# Split task: research → write → review
async def pipeline_task(prompt):
    client = TMLPDClient()
    
    # Phase 1: Research (fast, broad)
    research = await client.execute(prompt, model="gemini-flash")
    
    # Phase 2: Write (premium quality)
    writing = await client.execute(f"Write detailed response about: {research.content}", 
                                   model="claude-3.5-sonnet")
    
    # Phase 3: Review (medium)
    review = await client.execute(f"Review: {writing.content}", 
                                 model="gpt-4o")
    
    return review.content
```

**TMLPD Feature:** Sequential multi-model pipeline support

---

### Q19: "How do I balance cost vs quality dynamically?"

```typescript
// Adaptive quality based on task complexity
const halo = new HALOOrchestrator({ enableMCTS: true });

const result = await halo.execute("Complex microservices architecture", async (subtask) => {
    // MCTS evaluates: is subtask simple? use cheap model
    // Is it complex? use premium model
    return executeSubtask(subtask, { 
        max_cost: subtask.complexity > 0.7 ? 0.50 : 0.05 
    });
});
```

**TMLPD Feature:** HALO + MCTS for adaptive cost/quality

---

### Q20: "How do I handle multilingual routing (Chinese, etc)?"

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()

# Chinese language detection
chinese_prompt = "解释量子纠缠"
task_type = lite.classify_task(chinese_prompt)
# TaskType.CHINESE

# Routes to: claude-glm (best for Chinese), claude-minimax
models = lite.get_optimal_models(task_type, 2)
```

**TMLPD Feature:** Built-in multilingual task classification

---

## 6. Context & Memory Issues

### Q21: "How do I maintain conversation context across multiple calls?"

```typescript
// Episodic memory for conversation continuity
const memory = new EpisodicMemoryStore();

// Store interaction
memory.store({
    task: { description: "User asked about quantum physics", type: "explanation" },
    result: { success: true, output: "Quantum physics explains..." },
    agent: { id: "session-123", model: "gpt-4o", provider: "openai" },
    metadata: { context_window_used: 4096 },
    importance: 0.7
});

// Later: recall relevant context
const past = memory.getSimilarTasks("quantum entanglement", 5);
// Returns previous quantum-related conversations
```

**TMLPD Feature:** EpisodicMemoryStore for context persistence

---

### Q22: "How do I manage long context without cost explosion?"

```python
# Intelligent context chunking
async def long_context_handler(prompt, max_tokens=4000):
    client = TMLPDClient()
    
    # Detect if prompt is too long
    estimated_tokens = len(prompt.split()) * 1.3
    
    if estimated_tokens > max_tokens:
        # Summarize and compress context
        summary = await client.execute(
            f"Summarize key points: {prompt[:10000]}",
            model="gemini-flash"  # Cheap for summarization
        )
        return await client.execute(f"Based on: {summary}", model="premium-model")
    
    return await client.execute(prompt, model="premium-model")
```

**TMLPD Feature:** Context chunking + compression patterns

---

### Q23: "How do I learn from past successful tasks?"

```python
# Store successes for future reference
memory = EpisodicMemoryStore()

result = await client.execute("Complex Python async pattern")
if result.success:
    memory.store({
        task: { description: "Python async pattern", type: "coding", complexity: 3 },
        result: { success: True, output: result.content, cost: result.cost },
        agent: { model: result.model },
        metadata: {},
        importance: 0.9  # High importance = longer retention
    })

# Future similar task benefits from this experience
```

**TMLPD Feature:** Episodic memory with importance weighting

---

## 7. Framework Integration Issues

### Q24: "How do I use TMLPD with LangChain?"

```python
from langchain.llms import BaseLLM
from tmlpd import TMLPDLite

class TMLPDLLM(BaseLLM):
    def __init__(self, task_type="default"):
        self.lite = TMLPDLite()
        self.task_type = task_type
    
    def _call(self, prompt: str, **kwargs) -> str:
        result = self.lite.process(prompt)
        return result["content"]

# Use with LangChain chains
llm = TMLPDLLM(task_type="coding")
chain = prompt | llm | output_parser
```

**TMLPD Feature:** LangChain `BaseLLM` compatible wrapper

---

### Q25: "How do I use TMLPD with LlamaIndex?"

```python
from llama_index.llms import LLM
from tmlpd import TMLPDLite

class TMLPDLLM(LLM):
    def __init__(self, task_type="default"):
        self.lite = TMLPDLite()
    
    @property
    def metadata(self):
        return {"name": "TMLPD", "model_names": ["gpt-4o", "claude", "gemini"]}
    
    def complete(self, prompt: str) -> str:
        return self.lite.process(prompt)["content"]
    
    async def acomplete(self, prompt: str) -> str:
        return self.complete(prompt)

# Use in LlamaIndex queries
llm = TMLPDLLM()
response = index.query("Explain quantum", llm=llm)
```

**TMLPD Feature:** LlamaIndex `LLM` interface compatible

---

### Q26: "How do I create AutoGen agents with TMLPD?"

```python
from autogen import AssistantAgent
from tmlpd import TMLPDLite

class TMLPDAgent(AssistantAgent):
    def __init__(self, name, task_type="default", **kwargs):
        super().__init__(name, **kwargs)
        self.lite = TMLPDLite()
        self.task_type = task_type
    
    def generate_reply(self, messages, sender, **kwargs):
        last_msg = messages[-1]["content"]
        result = self.lite.process(last_msg)
        return result["content"]

# Create multi-agent system
coder = TMLPDAgent("coder", task_type="coding")
reviewer = TMLPDAgent("reviewer", task_type="analysis")
```

**TMLPD Feature:** AutoGen `AssistantAgent` base class

---

### Q27: "How do I integrate with CrewAI?"

```python
from crewai import Agent
from tmlpd import TMLPDLite

class TMLPDAgent(Agent):
    def __init__(self, role, goal, backstory, task_type="default"):
        super().__init__(role=role, goal=goal, backstory=backstory)
        self.lite = TMLPDLite()
        self.task_type = task_type
    
    def execute_task(self, task, context=None):
        prompt = f"{context}\n\n{task}" if context else task
        result = self.lite.process(prompt)
        return result["content"]

# Create crew
researcher = TMLPDAgent(
    role="Researcher",
    goal="Research AI topics thoroughly",
    backstory="Expert AI researcher",
    task_type="analysis"
)
```

**TMLPD Feature:** CrewAI `Agent` pattern compatible

---

## 8. Future Capabilities

### Q28: "How do I enable semantic search over cached responses?"

```typescript
// Coming in v1.2: Semantic cache
const semanticCache = new SemanticMemoryStore({
    vector_dim: 768,  // Embedding dimension
    similarity_threshold: 0.85
});

// Store with embedding
semanticCache.store({
    prompt: "Explain neural network backpropagation",
    response: "Backpropagation is...",
    embedding: await getEmbedding("Explain neural network backpropagation")
});

// Future query finds semantically similar cached response
const cached = await semanticCache.findSimilar("How does backprop work?");
// Returns "Explain neural network backpropagation" - high similarity
```

**Planned:** ChromaDB-backed semantic memory (see full TMLPD)

---

### Q29: "How do I use MCTS for workflow optimization?"

```typescript
// Monte Carlo Tree Search for task planning
const mcts = new MCTSWorkflowOptimizer({
    maxIterations: 50,
    explorationConstant: 1.414  // UCB1 tuned
}, ["claude", "codex", "gemini"]);

const strategy = await mcts.findBestStrategy(subtasks, async (subtask) => {
    // Evaluate which model works best for this subtask type
    const result = await executeWithModel(subtask);
    return { cost: result.cost, quality: evaluateQuality(result) };
});

console.log(strategy.model_picks);  // ["claude", "codex", "codex", "gemini"]
```

**TMLPD Feature:** MCTS workflow optimizer (reference implementation)

---

### Q30: "How do I orchestrate complex multi-step tasks with HALO?"

```typescript
// HALO: Hierarchical Adaptive LLM Orchestration
const halo = new HALOOrchestrator({
    maxConcurrent: 4,
    enableMCTS: true,
    maxDepth: 3  // Plan → Assign → Execute
});

const result = await halo.execute(
    "Build a complete REST API with auth, DB, and tests",
    async (subtask, agent) => {
        // HALO decomposes: 
        // Level 1: Plan (auth, models, routes, tests)
        // Level 2: Assign each to optimal agent
        // Level 3: Execute in parallel with fallback
        return executeSubtask(subtask, { maxConcurrent: 2 });
    }
);

console.log(result.strategy);  // { plan: [...], assignments: {...} }
```

**TMLPD Feature:** HALO orchestrator for complex task decomposition

---

## Feature Mapping Table

| Issue Category | Problem | TMLPD Solution |
|----------------|---------|----------------|
| **Parallel** | Run multiple providers | `execute_parallel()` |
| **Parallel** | Rate limit control | `maxConcurrent` config |
| **Parallel** | Stream multiple | `streaming: true` |
| **Cost** | Track spending | `getCostSummary()` |
| **Cost** | Set budgets | `budget.daily/monthly` |
| **Cost** | Route to cheap | Task classification |
| **Reliability** | Handle outages | Automatic fallback |
| **Reliability** | Retry backoff | Exponential + jitter |
| **Reliability** | Isolate failures | Provider health check |
| **Caching** | Cache responses | LRU cache with SHA-256 |
| **Caching** | Invalidate stale | `invalidateCache()` |
| **Caching** | Semantic match | EpisodicMemoryStore |
| **Routing** | Auto-route tasks | `classify_task()` |
| **Routing** | Multi-phase | Sequential pipelines |
| **Routing** | Multilingual | CHINESE task type |
| **Memory** | Persist context | EpisodicMemoryStore |
| **Memory** | Learn from past | Importance-weighted storage |
| **Framework** | LangChain | `TMLPDLLM(BaseLLM)` |
| **Framework** | LlamaIndex | `TMLPDLLM(LLM)` |
| **Framework** | AutoGen | `TMLPDAgent(AssistantAgent)` |
| **Framework** | CrewAI | `TMLPDAgent(Agent)` |

---

## Getting Started

```bash
# Install
npm install tmlpd-pi

# Python (copy python/tmlpd.py to your project)
```

```python
# Quick start - Python
from tmlpd import quick_process
result = quick_process("What is quantum entanglement?")
```

```typescript
// Quick start - TypeScript
import { createTMLPD } from "tmlpd-pi";
const tmlpd = createTMLPD();
const result = await tmlpd.executeParallel("Explain quantum", ["gpt-4o", "claude"]);
```

---

**Package:** [npmjs.com/package/tmlpd-pi](https://npmjs.com/package/tmlpd-pi)  
**Repository:** [github.com/Das-rebel/tmlpd-skill](https://github.com/Das-rebel/tmlpd-skill)