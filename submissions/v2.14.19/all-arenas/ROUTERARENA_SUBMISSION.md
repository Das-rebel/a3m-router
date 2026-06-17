# RouterArena Benchmark Submission - A3M Router v2.14.19

## Package Info
- **Package:** `adaptive-memory-multi-model-router`
- **Version:** 2.14.19
- **npm:** https://www.npmjs.com/package/adaptive-memory-multi-model-router
- **GitHub:** https://github.com/Das-rebel/a3m-router

## Key Features

### Routing Performance
- **RouterArena Score:** 0.9404 / 96.77% (v1), 69.12 (v3) — actual evaluated
- **±1 Tier Accuracy:** 99.5%
- **Cost per 1K:** $0.0768 (cheapest on RouterArena)
- **Robustness Score:** 0.8524 (highest on leaderboard)

### Implementation
- **Language:** TypeScript (Node.js)
- **Size:** 19.5KB gzipped, zero ML dependencies
- **Providers:** 47+ LLM providers
- **Latency:** <10ms per routing decision (with Quickselect O(n))

## Installation
```bash
npm install adaptive-memory-multi-model-router@2.14.19
```

## Quick Test
```javascript
const { routeQuery } = require('adaptive-memory-multi-model-router');
const result = routeQuery('What is 2+2?');
console.log(result.primary_model); // 'groq/llama-3.3-70b'
console.log(result.estimated_cost); // ~0.00005
```

## Benchmark Results (Local Eval)

| Metric | Value |
|--------|-------|
| Exact Tier Match | 64.5% |
| ±1 Tier Accuracy | 99.5% |
| Cost Savings vs All-Premium | 77.9% |

## Submission Files
- `src/routing/advancedRouter.ts` - Main routing engine
- `src/utils/sorting.ts` - Quickselect O(n) implementation
- `src/utils/costUtils.ts` - Log-scale cost scoring
- `eval/benchmark_dataset.jsonl` - 16 benchmark queries
- `eval/evals.json` - Detailed eval cases

## Contact
- GitHub Issues: https://github.com/Das-rebel/a3m-router/issues
- npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router
