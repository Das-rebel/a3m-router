# Architecture Vote

**Project:** A3M Router Architecture Analysis  
**Date:** 2026-06-03  
**Agents:** 3 (Architecture, Performance, Test Coverage)  
**Goal:** Identify top 3 improvements via council vote

---

## Architecture Vote

### Finding 1: BROKEN MAIN ENTRY POINT (Critical)

**Files:**
- `src/index.ts` (lines 63, 112)
- `src/routing/advancedRouter.ts` (MISSING)
- `src/cost/costTracker.ts` (MISSING)

**Problem:** The main public API (`index.ts`) exports from modules that do not exist:
```typescript
// Line 63 - MODULE NOT FOUND
export { CostTracker } from './cost/costTracker';

// Lines 110-112 - MODULE NOT FOUND  
import { CostTracker } from './cost/costTracker';
```

The `routing/advancedRouter.ts` is imported but never created - only `universal_router.py` (Python) exists.

**Solution:** 
1. Create `src/routing/advancedRouter.ts` as TypeScript wrapper around Python router, OR
2. Consolidate routing into existing TypeScript modules (`crossModelValidation.ts`, `providerRetry.ts`)
3. Replace missing `CostTracker` with existing `costAnalytics.ts` (already has full functionality)

**Deletion test:** FIXING SCATTERS complexity - deleting the broken exports would make the module load but lose public API surface. Must fix the imports properly.

---

### Finding 2: ROUTING LOGIC DUALITY (Python/TypeScript Boundary Leak)

**Files:**
- `src/routing/universal_router.py` (Python - learned routing, model profiles, online learning)
- `src/routing/providerRetry.ts` (TypeScript - thin wrapper)
- `src/ensemble.ts` (TypeScript - parallel execution, but assumes router works)
- `src/index.ts` (broken export chain)

**Problem:** The routing engine is split across two languages with no clear seam:
- `UniversalModelRouter` (Python) has all the ML logic: learned profiles, quality prediction, online learning
- TypeScript has fragments: `crossModelValidation.ts` (validator), `providerRetry.ts` (retry), `providerHealth.ts` (health)
- `ensemble.ts` calls `router.chat()` but router is undefined in TypeScript

The boundary leaks: `ensemble.ts` needs a router but can't access the Python `UniversalModelRouter` from TypeScript.

**Solution:** 
1. Implement routing logic in TypeScript for tight integration with ensemble
2. Keep `universal_router.py` as optional optimization, not required
3. Create `src/routing/index.ts` that exports unified routing interface

**Deletion test:** CONCENTRATES complexity - currently routing logic is scattered across 4+ files in 2 languages. Consolidation would reduce cognitive load.

---

### Finding 3: MEMORY SYSTEM FRAGMENTATION (6 implementations, no clear hierarchy)

**Files:**
- `src/memory/memoryTree.ts` (TypeScript, main)
- `src/memory/semantic_memory.py` (Python, ChromaDB optional)
- `src/memory/agentic_memory.py` (Python)
- `src/memory/working_memory.py` (Python)
- `src/memory/simple_memory.py` (Python)
- `src/memory/obsidianVault.ts` (TypeScript, export only)

**Problem:** 6 memory implementations with unclear purpose:
- No abstract base class or interface
- `MemoryTree.ts` has 3KB chunking, but Python memories have different semantics
- `semantic_memory.py` mentions "Memoria framework (arXiv:2512.12686)" but not integrated
- No clear path for when to use which memory

**Solution:**
1. Create abstract `MemoryStore` interface in TypeScript
2. Implement as `LocalMemoryStore` (current MemoryTree) and `SemanticMemoryStore` (current semantic_memory.py)
3. Drop `agentic_memory.py`, `working_memory.py`, `simple_memory.py` if unused or consolidate

**Deletion test:** CONCENTRATES complexity - consolidating 6 memory implementations into 2 clear abstractions reduces the surface area significantly.

---

### Finding 4: PROVIDER CONFIG TIGHT COUPLING (47+ providers baked in)

**Files:**
- `src/providers/providerConfig.ts` (1000+ lines of hardcoded provider definitions)

**Problem:** 47+ providers are baked into a single 1000+ line file with no abstraction:
- Adding/removing providers requires modifying core code
- Provider-specific logic (format: openai/anthropic/google) is duplicated per-provider
- No plugin architecture for third-party providers

**Solution:**
1. Create `ProviderAdapter` interface for API format handling (OpenAI, Anthropic, Google)
2. Move provider definitions to `providers/` as individual files
3. Implement registry pattern with hot-reload from config files

**Deletion test:** CONCENTRATES complexity - but splitting 1000 lines into 47 files creates new complexity. Better to create adapters and keep definitions data-driven.

---

## Vote: Priority Ranking

**I vote for Finding #1 (Broken Main Entry Point) as highest priority.**

**Rationale:** This is the only finding that currently BREAKS the build. The other findings are architectural debt, but Finding 1 prevents the public API from loading at all. No amount of internal refactoring matters if `import { A3MRouter } from 'adaptive-memory-multi-model-router'` fails.

**Implementation order:**
1. **P0:** Fix broken imports in `src/index.ts`
2. **P1:** Unify routing across Python/TypeScript boundary
3. **P2:** Consolidate memory system into 2 clear implementations
4. **P3:** Extract provider adapters from hardcoded config

---

*Submitted by: Architecture Agent*
