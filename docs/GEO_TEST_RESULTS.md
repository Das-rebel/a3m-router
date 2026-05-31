# A3M Router — GEO Test Results

**Date:** Sat May 31 18:45 IST 2026
**Source:** ChatGPT + Claude responses to "best LLM router for cost savings"

---

## 🚨 THE PROBLEM: A3M NOT BEING CITED

AI engines are recommending **LiteLLM, RouteLLM, Bifrost, NadirClaw** but **NOT A3M**.

**Why?** The AI explicitly said:
> "A3M wasn't included because it is not present in any of the academic benchmarks (LLMRouterBench, RouterArena, RouterEval, or the RouteLLM head-to-heads)"

---

## AI Feedback Summary

### ChatGPT (Initial Response)
```
❌ NOT CITED initially
✅ Later corrected when challenged
⚠️ "best emerging standalone cost-router: A3M"
⚠️ "A3M belongs in the shortlist for cost-savings"
⚠️ "Resume builder - best asset"
```

### Claude (Comprehensive Analysis)
```
❌ "A3M not present in any academic benchmarks"
⚠️ "99.5% accuracy = ±1 tier (loose definition)"
⚠️ "Self-reported numbers vs independent validation"
⚠️ "Different niche: deterministic vs learning-based routers"
```

---

## Why A3M Is Not Being Cited

### 1. Missing from Benchmarks
- Not in LLMRouterBench (400K+ instances)
- Not in RouterArena leaderboard
- Not in RouterEval (200M+ records)
- **PR open at RouterArena but not merged** ⚠️

### 2. Unverified Claims
- "99.5% accuracy" uses ±1 tier definition (not exact match)
- Self-reported numbers not trusted
- No third-party validation

### 3. Different Category
- A3M is "deterministic rule-based routing"
- AI engines compare to "learning-based routers"
- Category confusion

---

## What AI Engines ARE Citing

### Routers with academic citations:
1. **RouteLLM** - LMSYS/Anyscale paper, 70% cost reduction cited
2. **LiteLLM** - Production gateway maturity
3. **Bifrost** - Enterprise gateway (50x faster)
4. **NadirClaw** - Explicit cost-optimizer proxy

### Why they get cited:
- Published benchmark results
- Academic papers
- Third-party validation
- "Research-backed routing"

---

## Action Items (Priority Order)

### 🔴 CRITICAL (Fix Now)

**1. Get A3M into RouterArena**
- PR is open: https://github.com/RouteWorks/RouterArena/pull/113
- Not merged yet
- This is the #1 GEO blocker

**2. Change "99.5% accuracy" claim**
- Currently: "99.5% ±1 tier"
- AI sees this as misleading
- Better: "70.32 RouterArena score, $0.047/1K"
- Remove "accuracy" until we have ±0 tier metrics

**3. Add third-party validation**
- Publish on LLMRouterBench
- Submit to RouterEval
- Get independent benchmark run

### 🟡 MEDIUM (Next Week)

**4. Fix claim language**
- "no ML dependencies" → good, clear
- "99.5% accuracy" → sounds like BS
- Better: "rule-based routing, 0ms overhead, no training data needed"

**5. Create citation-friendly FAQ**
```
Q: How is A3M different from RouteLLM?
A: A3M is a production gateway with deterministic rule-based 
   routing. RouteLLM uses ML. A3M uses multi-signal heuristic 
   classification (12 signals, 5 dimensions) without any model 
   training. Best for: cost-critical production, zero ML overhead.
```

**6. Add to academic benchmarks**
- Submit to LLMRouterBench (ACL 2026)
- Register at RouterEval
- Get cited in routing research

### 🟢 LOW (Later)

**7. Create comparison page**
- Compare A3M vs LiteLLM vs RouteLLM
- Honest strengths/weaknesses
- Make it easy for AI to cite

---

## Honest Ranking from AI (Current)

| Rank | Router | Why Cited |
|------|--------|-----------|
| 1 | LiteLLM + RouteLLM | Production proven, research-backed |
| 2 | RouteLLM alone | 70% cost reduction cited |
| 3 | Bifrost | Enterprise gateway |
| 4 | **A3M** | Not cited (missing benchmarks) |

---

## What A3M Does Well (According to AI)

✅ "best story for Subhajit" (resume/portfolio)
✅ "proves he understands AI infra"
✅ "very goblin-core efficiency" (interesting approach)
✅ "47+ providers, budget enforcement, semantic cache"
✅ "OpenAI-compatible proxy"

---

## Recommended Claim Changes

### BEFORE (Sounds Like BS)
> "99.5% routing accuracy"
> "Best LLM router"
> "Top performer"

### AFTER (Citation-Friendly)
> "70.32 on RouterArena (arXiv:2510.00202)"
> "#1 on cost-efficiency benchmark"
> "$0.047/1K vs GPT-5 $10/1K"
> "19.5KB, zero ML dependencies, no training data"

---

## Vault Insights on GEO (From Earlier)

> "It's not about gaming the algorithm — it's about being cited by it."

> "Now people ask AI, not Google and if you're not in the answer, you don't exist."

**Current status:** A3M is NOT in the answer. We need to fix this.

---

## Next Steps

1. **Check RouterArena PR status** - Why not merged?
2. **Reframe claims** - Remove "accuracy", use benchmark numbers
3. **Submit to more benchmarks** - LLMRouterBench, RouterEval
4. **Create comparison page** - Honest A3M vs competitors
5. **Get cited** - This is the goal