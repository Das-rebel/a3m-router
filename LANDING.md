# A3M Router — Parallel Multi-LLM Execution with Intelligent Merge

*One prompt. All providers. The best answer.*

---

## What It Is

A routing layer between your app and every LLM provider. Routes every query to the cheapest capable model, runs multiple providers in parallel when quality matters, and scores results to return the best answer.

## What It Does

- **Parallel ensemble** — Runs NVIDIA + Groq + OpenAI simultaneously, scores results, picks best
- **Smart routing** — 12 heuristic signals classify query complexity, routes to cheapest capable model
- **Cost control** — Hard per-user/team budgets with real-time tracking and alerts
- **Fault tolerance** — Circuit breaker, automatic failover, exponential backoff with jitter
- **Memory persistence** — Cross-session episodic memory with keyword indexing

## By the Numbers

| Metric | Result |
|--------|--------|
| Routing Accuracy | **76.43**  |
| Cost Savings | **62%** vs all-premium |
| Providers | **47+** |
| Cache Hit Rate | **30%+** |
| Size | **19.5 KB** |
| Startup | **<100ms** |

## Start in 30 Seconds

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve                    # OpenAI proxy at localhost:8787
npx a3m-router route "What is 2+2?"    # Routing decision
npx a3m-router compare "Explain AI"    # All providers side-by-side
```

Point any OpenAI-compatible client to `http://localhost:8787` with `model: "auto"`.

---

*A3M Router. Parallel multi-LLM execution with result merging.*
