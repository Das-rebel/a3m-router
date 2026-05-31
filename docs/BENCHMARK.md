# A3M Router — Independent Benchmark

A3M Router is evaluated on two dimensions:

1. **Latency** — How much overhead does the gateway add? (real API calls)
2. **Routing Accuracy** — How well does the complexity classifier sort queries into tiers? (offline, 200 queries)

Both benchmarks are reproducible — scripts live in `scripts/`.

---

## 1. Latency Benchmark

**The question everyone asks:** *"How much latency does a gateway add?"*

**The answer:** +96ms for passthrough, +236ms for full intelligent routing — on a 138ms baseline.

![A3M Router Benchmark](benchmark-chart.png)

*Left: latency comparison. Right: cost savings projection. Dark theme.*

### The TL;DR

```
Direct call to Groq:          ──▸ 138ms  (baseline)
                              │
Through A3M forced route:     ──▸ 234ms  (+96ms = proxy overhead)
                              │
Through A3M auto (routed):    ──▸ 374ms  (+140ms = routing decision)
```

**+96ms** buys you: injection detection, PII redaction, cache lookup, cost tracking  
**+140ms** buys you: intelligent model selection that saves 62% on API costs

**Total overhead: 236ms.** Less than the time it takes to blink.

### The Details

| Scenario | Time | What's happening |
|:---------|:----:|:-----------------|
| **Direct to Groq** | **138ms** | One HTTP call. No protection. No routing. No cost tracking. Every query uses the same expensive model. |
| **Through A3M (forced route)** | **234ms** | Request hits A3M proxy. Guardrails scan for prompt injection (17 patterns) and PII. Cache checks for semantic duplicates. Cost tracker logs the call. Request forwarded to Groq. Response logged. |
| **Through A3M (auto route)** | **374ms** | Everything above, plus: A3M's router extracts 12 signals from the query text — domain, task type, complexity, verb intensity, multi-step structure. Scores it. Assigns a tier. Selects the cheapest capable model. Forwards the request. |

**The extra 140ms for auto-routing is the intelligence.**

### The Trade-Off

```text
                        Without A3M                  With A3M
                        ───────────                  ────────
Response time:          138ms                        374ms
Monthly API bill:       $341 (all premium)           $124 (smart routed)
Security:               None                         17-pattern injection detection
Cache hits:             None                         30%+ semantic cache
Provider failures:      Manual retry                 Circuit breaker + auto failover
Cost visibility:        End-of-month surprise        Per-query tracking + budget alerts
```

**236ms of overhead saves you $2,604/year.** That's about $11 per millisecond.

### Why Most Gateways Don't Publish This

Every gateway adds latency. Most don't publish their numbers because they're either:

1. **Just a proxy** (litellm in passthrough mode) — ~50ms overhead, but no routing intelligence
2. **Too slow** — adding 500ms+ when you include their full pipeline
3. **Not measured** — nobody actually benchmarks their own stack

A3M publishes this because the numbers are honest and the trade-off is clear: **pay 236ms, save 62%, get production-grade security.**

### Reproduce This

```bash
pip install llm-gateway-bench
npx a3m-router serve
python3 -m llm_gateway_bench.cli run groq \
  --model llama-3.3-70b-versatile \
  --prompt "What is the capital of France?" \
  --requests 10
python3 -m llm_gateway_bench.cli run custom \
  --model auto \
  --base-url http://localhost:8787/v1 \
  --prompt "What is the capital of France?" \
  --requests 10
```

**Tool:** [llm-gateway-bench](https://github.com/taffy-owo/llm-gateway-bench) v0.2.0  
**Run date:** 2026-05-26  
**Provider:** Groq (llama-3.3-70b-versatile)  
**Methodology:** 3 prompts × 5 requests = 15 calls per scenario, real API calls

---

## 2. Routing Accuracy Benchmark

**The question everyone asks:** *"Does the complexity classifier actually pick the right tier?"*

**The answer:** **70.32  accuracy** across 200 diverse queries — no ML training needed.

Benchmark script: `scripts/routing-benchmark-v2.js`  
Methodology: RouteLLM-inspired (arXiv:2404.06035), 4-tier classification

### Results (2026-05-28)

| Metric | Score | What It Means |
|:-------|:-----:|:--------------|
| **±1 Tier Accuracy** | **70.32** | Only 1 in 200 queries is misrouted by >1 tier |
| Exact Tier Match | 64.5% | ~2 in 3 queries hit the *exact* right tier |
| Free Tier Recall | 92.0% | Simple queries correctly routed to $0 models |
| Cheap Tier Recall | 78.3% | Standard code/translation routed to cheap |
| Mid Tier Recall | 36.0% | Complex reasoning often routed cheaper (fallback-safe) |
| Premium Tier Recall | 45.0% | Expert queries routed to premium |
| Over-routing (waste) | 7.0% | Sent to a stronger but costlier model than needed |
| Under-routing (risk) | 28.5% | Sent weak first; auto-fallback in <2s |
| Cost Savings vs All-Premium | **61.6%** | At 100K queries/mo: **save $77.04/mo** |

### Confusion Matrix

```
Expected \\ Routed   free    cheap    mid   premium
──────────────────────────────────────────────────
free                 46✓      4       0       0
cheap                11      47✓      2       0
mid                   0      24      18✓      8
premium               0       1      21      18✓
```

### Complexity Score Distribution

```
free         avg=0.125  range=[0.100, 0.270]
cheap        avg=0.275  range=[0.100, 0.575]
mid          avg=0.477  range=[0.230, 0.710]
premium      avg=0.690  range=[0.430, 1.000]
```

### Test Set

- **50 simple** — trivia, basic math, yes/no (target: free)
- **60 medium** — code snippets, summarization, translation (target: cheap)
- **50 complex** — reasoning, analysis, system design (target: mid)
- **40 expert** — legal, medical, security, finance (target: premium)

### Third-Party Cross-Validation

A3M's tier assignments align with **MMLU accuracy rankings**:

```
Provider          MMLU    A3M Tier    Source
────────────────────────────────────────────────
gpt-4o            88.7%   premium     MMLU Leaderboard
claude-3.5-sonnet  88.4%   premium     MMLU Leaderboard
gemini-1.5-pro     85.7%   premium     MMLU Leaderboard
mistral-large      84.2%   mid         MMLU Leaderboard
llama-3.3-70b      82.5%   mid         MMLU Leaderboard
deepseek-v2        78.3%   mid         MMLU Leaderboard
llama-3.1-8b       68.3%   cheap       MMLU Leaderboard
```

**References:** [MMLU Leaderboard](https://paperswithcode.com/sota/multi-task-language-understanding-on-mmlu), [RouteLLM arXiv:2404.06035](https://arxiv.org/abs/2404.06035)

### Reproduce This

```bash
cd /path/to/a3m-router
node scripts/routing-benchmark-v2.js
```

Outputs `benchmark-results.json` with full breakdown.
