# Agent Council: Architecture Deepening Analysis

**Router:** adaptive-memory-multi-model-router (TMLPD)
**Date:** 2026-06-03
**Council Role:** Architecture Agent

---

## Executive Summary

The codebase has a **structural anomaly**: two critical modules are imported throughout the codebase but do not exist as TypeScript files. Beyond this, the architecture shows four high-value deepening candidates. The unique differentiator (ensemble parallel voting) is under-implemented relative to its strategic importance.

---

## Anomaly: Missing TypeScript Modules

Two modules are exported and imported everywhere but have no corresponding `.ts` file:

| Missing File | Referenced In | Exported From |
|---|---|---|
| `src/routing/advancedRouter.ts` | `src/index.ts`, `src/sdk.ts`, `src/server/modelMapper.ts` | `routeQuery`, `routeBatch`, `recommendForTask`, `extractQueryFeatures`, `MODEL_PROFILES`, `updateModelProfile`, `getProviderHealth` |
| `src/cost/costTracker.ts` | `src/index.ts`, `src/server/proxyServer.ts` | `CostTracker` class |

**Impact:** The main routing engine and cost recording system are entirely absent. The TypeScript routing layer is non-functional without these files. The Python `universal_router.py` partially fills this gap but has no TypeScript integration point.

---

## Candidate 1: The Routing Engine Hole (P0)

### Files Affected
- **MISSING:** `src/routing/advancedRouter.ts`
- **AFFECTED:** `src/sdk.ts`, `src/server/modelMapper.ts`, `src/index.ts`

### Problem: Interface Without Implementation

The TypeScript surface area exports routing functions (`routeQuery`, `extractQueryFeatures`, `routeBatch`) but the file containing them does not exist. The `modelMapper.ts` imports from this non-existent file:

```typescript
// modelMapper.ts line 5
import { routeQuery } from "../routing/advancedRouter";  // FILE DOES NOT EXIST
```

The routing decision pipeline is split across three uncoordinated systems:
1. **TypeScript `modelMapper.ts`** (trivial: alias resolution only)
2. **TypeScript `proxyServer.ts`** (handles fallback chain manually)
3. **Python `universal_router.py`** (learned routing, but no TypeScript bridge)

### Solution: Implement `advancedRouter.ts`

Create `src/routing/advancedRouter.ts` as the single routing decision engine:

```
src/routing/advancedRouter.ts
  ├── extractQueryFeatures()          // Feature extraction (10+ signals)
  ├── MODEL_PROFILES                   // Static quality profiles per model
  ├── updateModelProfile()             // Runtime profile updates
  ├── getProviderHealth()              // Health status per provider
  ├── routeQuery()                     // Main routing decision
  ├── routeBatch()                     // Batch routing
  └── recommendForTask()                // Task-based recommendations
```

This module should:
- Call `UniversalModelRouter` from Python via FFI/subprocess for learned routing
- Provide the TypeScript feature extraction layer (complexity, domain, code, math, multilingual signals)
- Manage the tier-based routing (free/cheap/mid/premium)
- Integrate with `ProviderHealthManager` for fallback chain ordering

### Benefits
- **Leverage:** Enables the full routing pipeline. Without this, the TypeScript SDK is non-functional.
- **Locality:** All routing logic in one place. Currently scattered across 3 files.
- **Testability:** Can unit-test feature extraction and routing decisions independently.
- **Seam quality:** Provides a clean interface for the Python learned router.

---

## Candidate 2: Ensemble Voting is Shallow (P0 — Core Differentiator)

### Files Affected
- `src/ensemble.ts` (66 lines)
- `src/index.ts` (EnsembleOrchestrator)

### Problem: Shallow Module

The ARCHITECTURE.md claims the **ensemble parallel voting** is the unique differentiator — "Nobody does parallel multi-LLM execution with result merging." Yet the `EnsembleOrchestrator` class is 66 lines of naive code:

```typescript
// ensemble.ts — current implementation
if (strategy === 'majority') {
  const counts = {};
  successful.forEach(r => counts[r.answer] = (counts[r.answer] || 0) + 1);
  // ... naive string equality matching
}
```

Problems:
1. **No parallel execution:** Uses `Promise.all` but treats results as independent strings
2. **No confidence weighting:** Doesn't use quality scores from provider responses
3. **No semantic similarity:** Uses exact string matching for voting — answers rarely match exactly
4. **No answer fusion:** Doesn't merge partial or complementary answers
5. **No model quality profiles:** Ignores the `MODEL_PROFILES` that should inform weighting
6. **Dead code:** `EnsembleOrchestrator` receives `router: A3MRouter` but the A3MRouter has no `.chat()` method — the ensemble can't actually call providers

### Solution: Deepen the Ensemble System

Split `ensemble.ts` into a proper subsystem:

```
src/ensemble/
  ├── index.ts                        # EnsembleOrchestrator facade
  ├── parallelExecutor.ts             # Promise.all parallel dispatch
  ├── semanticVoter.ts                # Cosine-similarity-based answer voting
  ├── confidenceWeighter.ts           # Model quality profile weighting
  ├── answerFusion.ts                 # Merge complementary partial answers
  └── types.ts                        # EnsembleStrategy, EnsembleResult types
```

Key improvements:
- **Semantic voting:** Embed provider answers and compute cosine similarity for fuzzy agreement
- **Confidence-weighted merging:** Use `MODEL_PROFILES` quality scores as vote weights
- **Partial answer fusion:** When no answer achieves consensus, merge the most complementary responses
- **Timeout-aware parallel:** Set per-provider timeouts and cancel slow providers

### Benefits
- **Leverage:** This IS the product's unique value. Currently it's marketing, not code.
- **Locality:** Ensemble logic isolated to its own subsystem.
- **Testability:** Each sub-component (voter, weighter, fusion) independently testable.
- **Strategic:** Reinforces the core competitive advantage.

---

## Candidate 3: Cost Tracking System is Missing (P1)

### Files Affected
- **MISSING:** `src/cost/costTracker.ts`
- **AFFECTED:** `src/server/proxyServer.ts`, `src/index.ts`

### Problem: Incomplete Module

`proxyServer.ts` imports and instantiates `CostTracker`:
```typescript
import { CostTracker } from "../cost/costTracker";  // FILE DOES NOT EXIST
const costTracker = new CostTracker();
```

The `CostAnalytics.ts` (304 lines) is fully implemented and rich. But the core `CostTracker` class it depends on is missing. This means cost recording at the proxy layer doesn't exist.

### Solution: Implement `costTracker.ts`

```typescript
// src/cost/costTracker.ts
export class CostTracker {
  private records: Map<string, CostRecord[]>;
  
  record(provider: string, model: string, inputTokens: number, outputTokens: number, latencyMs: number): void
  getSummary(period?: 'hour' | 'day' | 'week' | 'month'): CostSummary
  getByProvider(): Record<string, ProviderCostSummary>
  getByModel(provider: string): Record<string, ModelCostSummary>
  reset(): void
}
```

This should:
- Record every request with full metadata (provider, model, tokens, latency)
- Compute per-request cost using provider's `costPerK` rates
- Feed into `CostAnalytics` for aggregate reporting
- Provide the data layer that `costAnalytics.ts` operates on

### Benefits
- **Leverage:** Enables the cost tracking and savings reporting (key user value).
- **Locality:** Cost recording isolated to its own class.
- **Seam quality:** Clean interface between the proxy server and analytics.
- **Testability:** Can test cost calculations independently.

---

## Candidate 4: Monolithic Provider Configuration (P1)

### Files Affected
- `src/providers/providerConfig.ts` (951 lines, single file)

### Problem: Shallow/Tightly-Coupled Monolith

All 40+ providers are defined in a single 951-line file with zero internal structure:

```typescript
// All in one file:
export const DEFAULT_PROVIDERS: Record<string, ProviderDefinition> = {
  ollama: { ... },
  lmstudio: { ... },
  groq: { ... },
  // 40 more...
  deepseek: { ... },
  // ...all in one object
};
```

Problems:
1. **Interface ≈ Implementation:** The file IS the data. Adding a provider requires editing the file.
2. **No lazy loading:** All providers initialized on import, even if API keys are missing.
3. **Testability:** Cannot test one provider's logic in isolation.
4. **Maintenance:** Hard to track provider-specific behavior (Chinese provider latency handling is scattered in `providerRetry.ts`).
5. **Coupling:** Provider definitions, config loading, runtime registration, and health checking all in one file.

### Solution: Provider Subsystem Deepening

Split into a provider subsystem:

```
src/providers/
  ├── index.ts              # Re-exports
  ├── types.ts              # ProviderTier, ProviderFormat, ProviderType, ProviderDefinition
  ├── defaults/
  │   ├── free.ts           # Ollama, LM Studio, vLLM, Google, NVIDIA NIM
  │   ├── cheap.ts          # Groq, Cerebras, DeepInfra, Together, Fireworks...
  │   ├── mid.ts           # DeepSeek, Mistral, Perplexity, Cohere...
  │   ├── premium.ts       # OpenAI, Anthropic, xAI
  │   └── enterprise.ts    # Azure, Bedrock, Vertex
  ├── registry.ts           # ProviderRegistry class (lazy loading, runtime registration)
  ├── loader.ts            # Config file loading (JSON → ProviderDefinition[])
  ├── health.ts            # ProviderHealth interface + checker
  └── providerConfig.ts    # Keep only the runtime API (registerProvider, getAvailableProviders)
```

Each tier file exports only its provider definitions:
```typescript
// src/providers/defaults/cheap.ts
export const CHEAP_PROVIDERS: ProviderDefinition[] = [
  groqProvider(),
  cerebrasProvider(),
  // ...
];

function groqProvider(): ProviderDefinition {
  return {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    // ...
  };
}
```

Benefits:
- **Leverage:** Lazy loading means only providers with valid API keys are initialized.
- **Locality:** Provider-specific behavior (timeout, retry config) co-located with the provider definition.
- **Testability:** Each provider factory function independently testable.
- **Seam quality:** Breaking the monolith creates clean seams between tiers.

---

## Candidate 5: Proxy Server Monolith (P1)

### Files Affected
- `src/server/proxyServer.ts` (1105 lines, single file)

### Problem: God Object

The proxy server handles **6 distinct responsibilities** in one 1105-line file:

1. HTTP server setup + routing
2. OpenAI-compatible request parsing
3. Provider calls (OpenAI, Anthropic, Google, local)
4. Streaming SSE handling (5+ code paths)
5. Fallback chain logic
6. Request logging + health reporting

This makes it impossible to:
- Test streaming logic without a full HTTP server
- Swap the Anthropic API formatter independently
- Modify the fallback logic without touching provider call code
- Add a new API format (e.g., Cohere, AWS Bedrock) cleanly

### Solution: Deepen into Subsystem

```
src/server/
  ├── proxyServer.ts         # Thin HTTP glue (~100 lines)
  ├── handlers/
  │   ├── chatCompletions.ts  # POST /v1/chat/completions
  │   ├── completions.ts      # POST /v1/completions
  │   └── models.ts           # GET /v1/models
  ├── providers/
  │   ├── openaiCompat.ts     # Standard OpenAI-compatible calls
  │   ├── anthropic.ts        # Anthropic Messages API
  │   ├── google.ts           # Google Gemini API
  │   └── local.ts            # Ollama, vLLM, LM Studio
  ├── streaming/
  │   ├── sseNormalizer.ts    # Normalize SSE streams to OpenAI format
  │   └── streamManager.ts     # Timeout, backpressure, chunk handling
  ├── fallback/
  │   └── fallbackChain.ts     # Provider fallback orchestration
  └── healthReporter.ts        # /health endpoint data assembly
```

### Benefits
- **Leverage:** Each provider format independently swappable.
- **Locality:** A bug in streaming logic doesn't touch provider calls.
- **Testability:** Each handler and provider formatter testable in isolation.
- **Extensibility:** Adding Cohere or Bedrock formats = new file, no existing file edited.

---

## Summary Table

| Candidate | Files | Severity | Impact | Effort |
|---|---|---|---|---|
| 1. Routing Engine Hole | `advancedRouter.ts` (MISSING) | P0 | TypeScript SDK non-functional | Medium |
| 2. Ensemble Voting | `ensemble.ts` (66 lines) | P0 | Core differentiator under-built | High |
| 3. CostTracker Missing | `costTracker.ts` (MISSING) | P1 | Cost recording doesn't work | Medium |
| 4. Provider Monolith | `providerConfig.ts` (951 lines) | P1 | Hard to maintain, test | Medium |
| 5. Proxy Monolith | `proxyServer.ts` (1105 lines) | P1 | Untestable streaming logic | High |

---

## Top 3 Recommendations for Council Vote

### Recommendation 1: CRITICAL — Fix the Missing Routing Engine (Vote: P0)
**File to create:** `src/routing/advancedRouter.ts`

This unblocks the entire TypeScript routing pipeline. Without it, the SDK, proxy, and modelMapper all have dangling imports. Prioritize before any other work.

**Acceptance criteria:**
- `routeQuery()` returns a valid `RouterDecision` for any string input
- `extractQueryFeatures()` produces 10+ signal feature vector
- Integrates with `ProviderHealthManager` for health-aware fallback ordering
- Exports `MODEL_PROFILES` as the static quality baseline

### Recommendation 2: HIGH — Deepen Ensemble Voting (Vote: P0)
**File to modify:** `src/ensemble.ts` → `src/ensemble/`

Build the ensemble subsystem that is the claimed unique differentiator. Start with semantic voting (cosine similarity on embeddings) and confidence weighting. The current exact-string-match voting will never produce results in production.

**Acceptance criteria:**
- Ensemble dispatches to 3+ providers in parallel with per-provider timeouts
- Voting uses semantic similarity (embeddings) not exact string match
- Confidence-weighted merging uses `MODEL_PROFILES` quality scores
- "Uncertain" flag triggers fallback or partial answer fusion

### Recommendation 3: HIGH — Implement CostTracker (Vote: P1)
**File to create:** `src/cost/costTracker.ts`

The `CostAnalytics` (304 lines) is the most complete analytics module in the codebase. It needs the `CostTracker` data layer to function. This unblocks the savings reporting which is a key selling point.

**Acceptance criteria:**
- `CostTracker.record()` stores per-request data (provider, model, tokens, latency, cost)
- Integrates with proxy server to record every request
- Feeds `CostAnalytics` for aggregate reporting
- Supports reset and export
