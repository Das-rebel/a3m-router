# Agent Council Findings - A3M Router
**Date:** 2026-06-03  
**Council:** Architecture Agent, Performance Agent, Test Coverage Agent

---

## 🚨 CRITICAL: Build is BROKEN

The TypeScript compilation fails with missing modules:

```
src/index.ts(63,29): error TS2307: Cannot find module './cost/costTracker'
src/index.ts(110,58): error TS2307: Cannot find module './routing/advancedRouter'
src/sdk.ts(32,8): error TS2307: Cannot find module './routing/advancedRouter'
src/server/proxyServer.ts(20,29): error TS2307: Cannot find module '../cost/costTracker'
```

**Missing TypeScript files:**
| File | Status |
|------|--------|
| `src/routing/advancedRouter.ts` | ❌ MISSING (only `dist/` exists) |
| `src/cost/costTracker.ts` | ❌ MISSING (only `dist/` exists) |

**Why tests pass:** Tests use `dist/` (compiled JS), not `src/` (TypeScript).

---

## Council Votes

| Agent | Vote | Finding |
|-------|------|---------|
| **Architecture** | Finding #1 | Missing TypeScript source files break build |
| **Performance** | Finding #1 | Profile rebuilding on every routeQuery() |
| **Test Coverage** | Finding #1 | GuardrailEngine has zero tests |

---

## Top 3 Improvements

### #1: Restore Missing TypeScript Source Files 🔴 P0
**Agent Vote:** Architecture ✅ (unanimous)

**Problem:** `src/routing/advancedRouter.ts` and `src/cost/costTracker.ts` are missing. The `dist/` files exist but are orphaned from source.

**Solution:** 
1. Create `src/cost/costTracker.ts` from the exported interface in `dist/`
2. Create `src/routing/advancedRouter.ts` - the core routing engine
3. Fix `src/index.ts` to import from existing source files

**Files needed:**
- `src/cost/costTracker.ts` (~100 lines)
- `src/routing/advancedRouter.ts` (~300 lines)

**Effort:** Medium | **Priority:** CRITICAL

---

### #2: Cache Profile Rebuilding in routeQuery() 🟡 P1
**Agent Vote:** Performance ✅

**Problem:** `refreshModelProfiles()` is called on EVERY `routeQuery()` call, rebuilding O(n*m) provider/model objects unnecessarily.

**Current code:**
```javascript
function routeQuery(prompt, available_models, budget_multiplier = 1.0) {
  refreshModelProfiles();  // CALLED EVERY TIME - O(n*m)
  // ...
}
```

**Solution:** Add lazy cache with invalidation:
```typescript
let cachedProfiles: ModelProfile[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getModelProfiles() {
  const now = Date.now();
  if (!cachedProfiles || (now - cacheTimestamp) > CACHE_TTL_MS) {
    cachedProfiles = buildModelProfiles();
    cacheTimestamp = now;
  }
  return cachedProfiles;
}
```

**Expected gain:** ~90% reduction in routing overhead (5-10ms → <1ms)

**Effort:** Low | **Priority:** High

---

### #3: Add GuardrailEngine Tests 🔵 P2
**Agent Vote:** Test Coverage ✅

**Problem:** GuardrailEngine (~500 lines, security-critical) has ZERO tests. This is a major production risk.

**Coverage needed:**
- Pattern matching tests
- PII redaction tests
- Content filtering tests
- Bypass detection tests

**Solution:** Add `tests/security/guardrailEngine.test.ts`:
- 20+ test cases covering all 17 patterns
- Edge cases: empty input, malformed data, unicode
- Performance: <10ms per validation

**Effort:** Medium | **Priority:** High

---

## Other Findings (Lower Priority)

| Finding | Agent | Problem | Effort |
|---------|-------|---------|--------|
| Token counting no memoization | Performance | O(n) word split every call | Low |
| Memory O(n) linear search | Performance | No inverted index | Medium |
| EnsembleOrchestrator untested | Test Coverage | Missing integration tests | Medium |
| Provider config bloat | Architecture | 47+ providers in 1000+ line file | Low |

---

## Implementation Plan

1. **Fix missing TS files** (Day 1) - CRITICAL
2. **Add profile caching** (Day 2) - Quick win
3. **Add GuardrailEngine tests** (Day 3) - Production safety
4. **Add token memoization** (Day 4) - Low effort
5. **Add memory inverted index** (Day 5) - Future scaling

---

## Council Summary

| Vote | Count | Topic |
|------|-------|-------|
| #1 | 3/3 | Missing TypeScript source files |
| #2 | 1/3 | Profile caching |
| #3 | 1/3 | GuardrailEngine tests |

**Unanimous verdict:** Restore missing source files FIRST (blocks everything else)
