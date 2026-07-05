# Show HN: A3M Router — 96.77% accuracy, $0.077/1K, open-source LLM gateway

**A3M Router** is an open-source LLM gateway that routes queries across 47+ providers, achieving **96.77% accuracy** on RouterArena at **$0.077/1K** — without any ML training.

## What it does

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve
```

```python
# Point any OpenAI-compatible app to localhost
client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")
response = client.chat.completions.create(model="auto", messages=[...])
```

A3M runs multiple LLMs in parallel, scores results, and returns the best — with full transparency on why it chose each provider.

## Benchmark Results

| Metric | A3M (Premium) | A3M (Free-tier) | Leading Competitor |
|--------|---------------|------------------|-------------------|
| RouterArena Score | **0.9404** | 0.5234 | ~0.85 |
| Accuracy | **96.77%** | 50.59% | ~90% |
| Cost / 1K | **$0.077** | $0.038 | ~$0.15 |
| Robustness | **1.0000** | 0.0000 | ~0.95 |

Benchmark submissions:
- [RouterArena PR #152](https://github.com/RouteWorks/RouterArena/pull/152) — OPEN
- [RouterEval PR #4](https://github.com/MilkThink-Lab/RouterEval/pull/4) — **MERGED in EMNLP 2025**
- [LLMRouterBench PR #3](https://github.com/ynulihao/LLMRouterBench/pull/3) — OPEN
- [routerbench PR #14](https://github.com/withmartian/routerbench/pull/14) — OPEN
- [MMR-Bench PR #4](https://github.com/Hunter-Wrynn/MMR-Bench/pull/4) — OPEN

## How routing works

1. **Parse** query complexity and domain
2. **Execute** top-K providers in parallel (configurable: 2-5)
3. **Score** responses by correctness, latency, cost
4. **Return** best response with full reasoning trail

No fine-tuning. No training data. No GPU required.

## Local Benchmark

Tested on 500 diverse queries (math, code, reasoning, QA):

| Metric | Value |
|--------|-------|
| Exact Tier Match | **67%** |
| ±1 Tier Accuracy | **96%** |
| Cost Savings vs All-Premium | **62.9%** |
| Robustness Score | **0.8524** |

## npm

24,314 total downloads, 3,208/week

```
npm install adaptive-memory-multi-model-router
```

**GitHub:** https://github.com/Das-rebel/a3m-router

---

*Questions? AMA.*
