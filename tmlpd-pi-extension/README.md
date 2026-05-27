# TMLPD — Parallel Multi-LLM Execution Module

> **Part of the [A3M Router](https://github.com/Das-rebel/a3m-router) ecosystem.**

Parallel multi-LLM execution with confidence-weighted ensemble merging. Runs providers simultaneously, scores each result, and returns the best answer with transparent reasoning.

## What This Is

A TypeScript library for executing prompts across multiple LLM providers **in parallel** — not sequentially. Every provider runs at the same time, results are scored on quality, and the best answer is selected with a clear explanation of why it won.

## Core Features

| Feature | Description |
|:--------|:------------|
| **Parallel execution** | Run N providers simultaneously, not sequentially |
| **Ensemble scoring** | Score results on specificity, structure, and relevance |
| **Query-type presets** | Auto-configure provider + temp per task type |
| **Cost tracking** | Per-query cost display with provider breakdown |
| **Persistent memory** | Cross-session `.memory.json` with keyword indexing |
| **Prefix caching** | RadixAttention-style caching for repeated prefixes |
| **Speculative decoding** | Medusa/EAGLE-style multi-token prediction |
| **Token compression** | ISON encoding for ~40% token reduction |

## Usage

```typescript
import { executeEnsemble, createPresetRouter, EpisodicMemoryStore } from "tmlpd-pi";

// Parallel ensemble: run all providers simultaneously, pick best
const result = await executeEnsemble(
  "Explain vector databases",
  systemPrompt,
  context,
  { nvidia: callNvidia, groq: callGroq }
);
console.log(`Winner: ${result.winner} (score: ${result.scores[result.winner]})`);

// Query-type presets: auto-configure per task
const router = createPresetRouter();
const preset = router.classify("Write a Python sort function"); // → 'code'

// Persistent memory
const memory = new EpisodicMemoryStore(1000, './memory.json');
const similar = memory.getSimilarTasks("Python async API", 5);
```

## Exports

- `createTMLPD`, `TMLPDTools` — Core parallel execution
- `executeEnsemble`, `mergeComplementary`, `recordFeedback` — P0 Ensemble voting
- `createPresetRouter`, `getPresetForQuery`, `DEFAULT_PRESETS` — P1 Query presets
- `EpisodicMemoryStore` — P3 Persistent memory with auto-save
- `CostTracker`, `BudgetEnforcer` — P2 Cost tracking
- `ResponseCache`, `PrefixCache` — Caching layers
- `HALOOrchestrator`, `MCTSWorkflowOptimizer` — Advanced orchestration

## Research Backing

- **RouteLLM** (arXiv:2404.06035) — Learned cost-quality routing
- **RadixAttention** (arXiv:2312.07104) — 5-10x speedup via prefix caching
- **Medusa** (arXiv:2401.10774) — 2-3x faster generation
- **A-Mem** (arXiv:2502.12110) — Episodic memory patterns

---

*Part of the A3M Router ecosystem. "Nobody does parallel multi-LLM execution with result merging. Everyone does sequential fallback."*
