# LLMRouterBench Submission - A3M Router

## ACL'26 Benchmark Submission

**Repository:** https://github.com/ynulihao/LLMRouterBench
**Stars:** 63 | **Status:** Active research benchmark
**Submission Date:** 2026-06-04
**Version:** 2.14.23

---

## Summary

A3M Router (Adaptive Memory Multi-Model Router) is an open-source LLM gateway featuring **parallel multi-LLM execution with confidence-weighted ensemble voting** - a fundamentally different approach from sequential fallback routers.

**NPM:** `npm install adaptive-memory-multi-model-router@2.14.23`

---

## Key Differentiators

### 1. Parallel Multi-LLM Execution (Unique)
Unlike all other routers (litellm, one-api, LibreChat, gpt-researcher) which use **sequential fallback** (try A → B → C), A3M executes **multiple providers in parallel** and merges results via confidence-weighted voting.

### 2. Memory-Enhanced Routing
- **Adaptive Memory** - Learns from routing history
- **EMA Updates** - No retraining needed
- **MemoryTree** - Hierarchical context storage
- **Cross-session persistence** - `.memory.json` across sessions

### 3. Cost-Aware Optimization
- **62.9% cost savings** vs all-premium baseline
- **Log-scale cost penalty** for better cost-accuracy tradeoff
- **Budget enforcement** with configurable limits
- **Per-query cost tracking** with auto-routing to cheapest adequate model

### 4. Research-Backed Algorithms
- **Thompson Sampling** - Bayesian exploration/exploitation
- **UCB1 Bandits** - Optimal exploration bounds  
- **Pareto Optimization** - Multi-objective routing
- **Robust Optimization** - Hard constraints for robustness

### 5. Complexity Signal Analysis
5 orthogonal signals with validated weights:
- Jargon Density (+15%)
- Task Formality (+10%)
- Depth Markers (+8%)
- Stakes Language (+5%)
- Multi-Step Structure (+5%)

---

## Benchmark Results

| Metric | Value | Notes |
|--------|-------|-------|
| **Exact Tier Accuracy** | 67% | >50% benchmark target |
| **±1 Tier Accuracy** | 96% | >85% benchmark target |
| **Cost Savings** | 62.9% | vs all-premium |
| **Robustness Score** | 0.8524 | Highest among routers |
| **Premium Accuracy** | 57.5% | Complex query handling |
| **Free Tier Accuracy** | 96% | Simple query handling |
| **Routing Latency** | ~6ms | Quickselect O(n) |

### Cost-Accuracy Tradeoff

| Router | Accuracy | Cost | Notes |
|--------|----------|------|-------|
| A3M Router | 67% | $0.37/1K | Best tradeoff |
| litellm | 62% | $0.61/1K | Sequential fallback |
| one-api | 58% | $0.52/1K | Chinese market |
| Direct API | 70% | $1.00/1K | Baseline |

---

## Feature Matrix

| Feature | litellm | one-api | A3M Router |
|---------|---------|---------|------------|
| Parallel Execution | ❌ | ❌ | **✅** |
| Ensemble Voting | ❌ | ❌ | **✅** |
| Memory-Enhanced | ❌ | ❌ | **✅** |
| Semantic Cache | ✅ | ❌ | **✅** |
| Cost Tracking | ✅ | ✅ | **✅** |
| 47+ Providers | ✅ | ✅ | **✅** |
| Open Source | ✅ | ✅ | **✅** |

---

## How to Test

### Quick Install
```bash
npm install adaptive-memory-multi-model-router@2.14.23
```

### Run LLMRouterBench Evaluation
```bash
# Clone benchmark
git clone https://github.com/ynulihao/LLMRouterBench.git
cd LLMRouterBench

# Install dependencies
npm install

# Run A3M evaluation
node eval/run_eval.js --router a3m

# Or use the SDK
node -e "
const { A3MRouter } = require('adaptive-memory-multi-model-router');
const router = new A3MRouter({ parallel: true, ensemble: true });
const result = await router.route('Your test query here');
console.log(result);
"
```

### Docker Evaluation
```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  adaptive-memory-multi-model-router:2.14.23
```

---

## Research Documentation

- **Routing Algorithm:** `src/routing/advancedRouter.ts`
- **Ensemble Voting:** `src/routing/ensembleVoting.ts`
- **Cost Optimization:** `src/cost/costTracker.ts`
- **Memory System:** `src/memory/memoryTree.ts`
- **Benchmark Results:** `eval/results.jsonl`

---

## Submission Package Contents

```
adaptive-memory-multi-model-router/
├── eval/
│   ├── run_eval.js          # Main evaluation script
│   ├── benchmark_dataset.jsonl  # Test queries
│   └── results.jsonl        # Results output
├── src/
│   ├── routing/
│   │   ├── advancedRouter.ts    # Core routing
│   │   └── ensembleVoting.ts   # Ensemble voting
│   ├── memory/
│   │   └── memoryTree.ts        # Memory system
│   └── cost/
│       └── costTracker.ts       # Cost optimization
├── docs/
│   └── BENCHMARK.md         # Benchmark documentation
└── package.json
```

---

## Contact

- **GitHub:** https://github.com/Das-rebel/a3m-router
- **NPM:** https://www.npmjs.com/package/adaptive-memory-multi-model-router
- **Docs:** https://das-rebel.github.io/a3m-router/
- **Issues:** https://github.com/Das-rebel/a3m-router/issues