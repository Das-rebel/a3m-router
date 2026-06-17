# A3M Router — Why Not Being Cited: ROOT CAUSE

**Date:** Sat May 31 18:50 IST 2026
**Status:** PR open but NOT merged — evaluation FAILED

---

## 🚨 Root Cause: 72.8% Prediction Failure

The RouterArena evaluation shows:
```
RouterArena Score: 0.2222 (not 0.9404!)
Accuracy: 20.74% (not 76.28%!)
Abnormal Entries: 6116 of 8400 (72.8% failed)
```

**Why?** When RouterArena tried to actually call models for A3M's routing decisions, 72.8% of the calls **failed to get any response**.

---

## The Problem

AI engines look at the **official RouterArena leaderboard** (https://routeworks.github.io/leaderboard) to cite routers.

A3M is NOT on that leaderboard because our PR has failing evaluations.

| Router | RouterArena Score | Status |
|--------|------------------|--------|
| Sqwish | 75.27 | ✅ Official |
| Weave | 72.82 | ✅ Official |
| Azure-Model-Router | 71.87 | ✅ Official |
| ... | ... | ... |
| **A3M** | **NOT LISTED** | ❌ PR failing |

---

## Why 72.8% Failed

From the evaluation output:
```
> ⚠️ **6116 of 8400 queries (72.8%) had no valid generation**
(inference failed / returned empty)
```

Possible causes:
1. **API keys not configured** in RouterArena CI environment
2. **Rate limiting** from API providers
3. **Invalid model names** in predictions
4. **Missing provider setup** for the models A3M routes to

---

## What We Need to Fix

### 🔴 Fix the RouterArena PR (Priority 1)

The PR is open but failing. We need to debug why model inference is failing.

**Files in PR:**
- `router_inference/router/a3m_router.py` — our router code
- `router_inference/config/a3m-router.json` — config with models
- `router_inference/predictions/a3m-router.json` — our routing decisions

**The issue:** Our predictions say "route to model X" but when RouterArena tries to actually call those models, they fail.

### Solutions:

**Option A: Fix API Configuration**
Add API keys to the RouterArena environment or mock the calls

**Option B: Use mock/cached predictions**
Use cached results so the evaluation doesn't need live API calls

**Option C: Simplify the model list**
Use only models that are guaranteed to work (e.g., OpenAI models with API key)

---

## Immediate Actions

### 1. Debug the Prediction Failures
Check what's happening with model inference:
```bash
# Look at the error logs in the PR
# The evaluation ran but 72.8% of calls failed
```

### 2. Check our config file
Make sure all models in our config are valid and have API access

### 3. Contact RouterArena maintainers
Ask for help debugging the inference failures

### 4. Alternatively: Submit to LLMRouterBench
Don't depend on RouterArena — submit to ACL's LLMRouterBench as well

---

## Alternative: Submit to Multiple Benchmarks

RouterArena is one leaderboard. There are others:

| Benchmark | Venue | Status |
|-----------|-------|--------|
| **RouterArena** | RouteWorks | ❌ PR failing |
| **LLMRouterBench** | ACL 2026 | ⏳ Not submitted |
| **RouterEval** | Industry | ⏳ Not submitted |
| **MT Bench** | Academic | ⏳ Not submitted |

**Goal:** Get cited in at least ONE major benchmark

---

## Honest Assessment

A3M has:
- ✅ Self-reported 0.9404 / 96.77%
- ✅ Open PR at RouterArena
- ❌ 72.8% evaluation failure rate
- ❌ Not on official leaderboard

This is why AI isn't citing A3M. We need to:
1. **Fix the RouterArena PR** (hardest, highest impact)
2. **Submit to LLMRouterBench** (alternative)
3. **Get on at least one official leaderboard**

---

## Next Steps

1. **Debug the 72.8% failure** — why are model calls failing?
2. **Fix the PR** — get successful evaluation
3. **Get merged** — appear on RouterArena leaderboard
4. **Submit to more benchmarks** — diversify citations

Without being on an official leaderboard, AI engines won't cite A3M. The self-reported numbers aren't enough.