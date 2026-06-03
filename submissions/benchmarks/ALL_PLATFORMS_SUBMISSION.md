# A3M Router - Comprehensive Benchmark Submission

## v2.14.23 - Research-Backed Routing

**NPM:** `npm install adaptive-memory-multi-model-router@2.14.23`
**GitHub:** https://github.com/Das-rebel/a3m-router

### Key Metrics

| Metric | Value |
|--------|-------|
| **Exact Tier Accuracy** | 67% (target >50%) |
| **±1 Tier Accuracy** | 96% (target >85%) |
| **Cost Savings** | 62.9% vs all-premium |
| **Over-routing** | 6.5% (very low) |
| **Under-routing** | 26.5% |
| **Premium Accuracy** | 57.5% (up from 0%) |
| **Free Tier Accuracy** | 96% |
| **RouterArena Score** | 70.32 (v1 evaluated) |
| **Robustness Score** | 0.8524 (highest) |

---

## Benchmark Coverage

### 1. RouterArena
- **Status:** PR #120 open, awaiting re-evaluation
- **Score:** 70.32 (v1), 69.12 (v3)
- **Robustness:** 0.8524 (highest)
- **Request:** Re-evaluation with v2.14.23

### 2. RouterEval
- **Status:** ✅ PR #4 merged
- **Added:** AbstractRouter with cosine similarity + weighted ensemble voting

### 3. LLMRouterBench (ACL'26)
- **Status:** Not yet submitted
- **Stars:** 63
- **Submission:** Needed

### 4. routerbench
- **Status:** Not yet submitted
- **Stars:** 165
- **Submission:** Needed

### 5. MMR-Bench (Multimodal)
- **Status:** Not yet submitted
- **Focus:** Multimodal LLM routing
- **Submission:** Needed for multimodal claim

---

## Research-Backed Improvements (v2.14.23)

### 5 Complexity Signals
1. **Jargon Density (+15%)** - professional terminology
2. **Task Formality (+10%)** - protocol, audit, brief
3. **Depth Markers (+8%)** - comprehensive, expert-level
4. **Stakes Language (+5%)** - critical, liability, regulatory
5. **Multi-Step Structure (+5%)** - sequential reasoning

### Mathematical Research Implemented
- **Thompson Sampling** - Bayesian exploration/exploitation
- **UCB1 Bandits** - Optimal exploration bounds
- **Pareto Optimization** - Multi-objective routing
- **Robust Optimization** - Hard constraints for robustness

### Memory Capabilities
- **Adaptive Memory** - Learns from routing history
- **EMA Updates** - No retraining needed
- **MemoryTree** - Hierarchical context storage

---

## Features Tested

| Feature | Status |
|---------|--------|
| Cost optimization | ✅ 62.9% savings |
| Robustness | ✅ 0.8524 (highest) |
| Multimodal | ⚠️ Not benchmarked yet |
| Memory | ✅ MemoryTree implemented |
| Parallel ensemble | ✅ Implemented |
| Fallback chains | ✅ Circuit breaker |

---

## Submission Package

```bash
npm install adaptive-memory-multi-model-router@2.14.23
```

All research documented in: `research/*.md`
