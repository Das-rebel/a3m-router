# TMLPD PI Extension — Parallel Multi-LLM for PI Agent

> **Part of the [A3M Router](https://github.com/Das-rebel/adaptive-memory-multi-model-router) ecosystem.**

PI agent tools for parallel multi-LLM execution with confidence-weighted ensemble merging. Powers `/tmlpd-parallel`, `/tmlpd-route`, `/tmlpd-compare`, and `/tmlpd-cost` commands in the PI CLI.

## What This Is

The PI agent integration for A3M Router. These tools let your PI agent:

- **Execute prompts across multiple LLMs in parallel** and pick the best result
- **Smart-route** single queries to the optimal provider based on task type
- **Track costs** across all providers and sessions
- **Persist agent memory** across CLI sessions

## Core Features

| Tool | Description |
|:-----|:------------|
| `tmlpd_execute` | Run prompt across multiple providers in parallel, merge results |
| `tmlpd_execute_single` | Smart-route to optimal single provider |
| Parallel ensemble | NVIDIA + Groq simultaneously, scored and merged |
| Cost tracking | Per-query cost display, provider-level breakdown |
| Persistent memory | Cross-session `.memory.json` with keyword indexing |

## Quick Start

```bash
npm install tmlpd-pi
```

```typescript
import { createTMLPD } from "tmlpd-pi";

const tmlpd = createTMLPD({ cache: { ttl_seconds: 3600 } });

// Parallel execution across providers
const result = await tmlpd.executeParallel(prompt, ["nvidia", "groq"]);

// With ensemble scoring
const { best, winner, scores } = await executeEnsemble(
  prompt, systemPrompt, context,
  { nvidia: callNvidia, groq: callGroq }
);
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
