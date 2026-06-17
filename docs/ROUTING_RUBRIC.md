# A3M Router — Routing Quality Rubric

Five dimensions, each measured against real evidence from production routing data. The composite score drives the pulse metric and surfaces where routing quality degrades.

## Formula

```
composite_score = 0.30 × RoutingAccuracy
                + 0.25 × CostEfficiency
                + 0.20 × Latency
                + 0.15 × ErrorHandling
                + 0.10 × CacheHitRate
```

**Weight justification:**
- **30% Accuracy** — Getting the right provider for the right query is the primary function. Everything else is secondary.
- **25% Cost Efficiency** — The core value proposition. If accuracy is perfect but costs are high, we failed at the value prop.
- **20% Latency** — Developer experience. A router that's slow gets bypassed regardless of accuracy.
- **15% Error Handling** — Reliability under provider failures. Matters most in production.
- **10% Cache Hit Rate** — Bonus optimization. Only matters at scale.

---

## 1. Routing Accuracy (30%)

*"Did the router send the query to the right tier?"*

### Scoring

| Score | Criterion |
|-------|-----------|
| 90-100 | >95% within ±1 tier. RouterArena score above 70. Fewer than 1 in 20 queries misrouted by more than one tier. |
| 75-89 | 85-95% within ±1 tier. RouterArena score 60-70. Occasional over-tiering on simple queries. |
| 60-74 | 70-85% within ±1 tier. RouterArena score 50-60. Noticeable over-tiering on medium queries. |
| 45-59 | 50-70% within ±1 tier. Frequent misrouting on complex/expert queries. |
| <45 | <50% within ±1 tier. Router is essentially random. Major overhaul needed. |

### Evidence to capture

- **RouteLLM comparison** — where RouteLLM routes vs A3M (reference benchmark)
- **Tier confusion matrix** — which query types cause the most over/under-tiering
- **RouterArena score** — the single-number benchmark (current: 96.77%)
- **Golden route deviation** — percentage of queries where A3M disagrees with golden route

### Common failure patterns

| Pattern | Fix |
|---------|-----|
| All queries go to free tier (0% to mid/premium) | Add confidence floor. If no provider has confidence > 0.5, fallback to premium |
| Code queries misrouted to creative models | Strengthen code-detection signals (``` blocks, function syntax) |
| Legal/medical routed to cheap models | Add domain detection for 5 safety-critical domains |
| Ambiguous queries bounce between tiers | Implement query-type confidence threshold |

### Dollar Impact

```
Wasted = (MismatchCount × AvgCostDelta) 
AvgCostDelta = |ActualCost - OptimalCost|
```

---

## 2. Cost Efficiency (25%)

*"Did the router save money compared to all-premium routing?"*

### Scoring

| Score | Savings vs All-Premium | CPP (Cost Per Query) |
|-------|----------------------|---------------------|
| 90-100 | >70% savings | <$0.001/query |
| 75-89 | 50-70% savings | $0.001-$0.003/query |
| 60-74 | 30-50% savings | $0.003-$0.006/query |
| 45-59 | 15-30% savings | $0.006-$0.01/query |
| <45 | <15% savings | >$0.01/query |

### Evidence to capture

- **Cost per query** over the measurement window
- **Savings vs all-premium** — total cost if every query went to GPT-4o
- **Free tier utilization** — % of queries handled by free/cheap providers
- **Budget cap hits** — how often budget enforcement is triggered
- **Provider cost breakdown** — cost per provider

### Common failure patterns

| Pattern | Fix |
|---------|-----|
| Everything routes to free (0% accuracy) | Add quality floor to cost optimization |
| Budget cap tripped too often | Increase budget cap or reduce free-tier usage |
| Premium providers selected for trivial queries | Lower confidence threshold for mid-tier |

### Dollar Impact

```
Savings = (TotalQueryCount × AvgPremiumCost) - ActualTotalCost
MonthlySavings = Savings × (30 / MeasurementDays)
```

---

## 3. Latency (20%)

*"How fast is the router decision?"*

### Scoring (P95 Latency)

| Score | P95 Latency | Overhead vs Direct |
|-------|------------|-------------------|
| 90-100 | <200ms | <50ms overhead |
| 75-89 | 200-500ms | 50-100ms overhead |
| 60-74 | 500-1000ms | 100-200ms overhead |
| 45-59 | 1-3s | 200-500ms overhead |
| <45 | >3s | >500ms overhead |

### Evidence to capture

- **P50, P95, P99 latency** — distribution
- **Routing decision overhead** — time spent in routing logic vs provider response
- **Slowest providers** — top 5 by latency
- **Cache response time** — cached vs uncached query time

---

## 4. Error Handling (15%)

*"How well does the router handle failures?"*

### Scoring

| Score | Criterion |
|-------|-----------|
| 90-100 | 0 unhandled failures. All provider failures caught by circuit breaker. Graceful fallback 100% of the time. |
| 75-89 | <1% unhandled failures. Circuit breaker catches most issues. Fallback succeeds >95%. |
| 60-74 | 1-3% unhandled failures. Occasional circuit breaker misses. Fallback succeeds >80%. |
| 45-59 | 3-10% unhandled failures. Circuit breaker coverage gaps. Fallback degrades. |
| <45 | >10% unhandled failures. Critical reliability issues. |

### Evidence to capture

- **Circuit breaker trips** — how many times each provider was disabled
- **Fallback success rate** — % of attempts where fallback succeeded
- **Unhandled failures** — queries that returned no response
- **Provider health score** — current health of each provider

### Common failure patterns

| Pattern | Fix |
|---------|-----|
| Circuit breaker never fires (wasteful retries) | Lower threshold for circuit breaker trip |
| Circuit breaker fires too often | Increase threshold, add validation before trip |
| All providers fail simultaneously | Add cold-start provider as emergency fallback |

---

## 5. Cache Hit Rate (10%)

*"How often does semantic cache avoid a duplicate provider call?"*

### Scoring

| Score | Cache Hit Rate |
|-------|---------------|
| 90-100 | >40% |
| 75-89 | 30-40% |
| 60-74 | 20-30% |
| 45-59 | 10-20% |
| <45 | <10% |

### Evidence to capture

- **Global cache hit rate** — across all queries
- **Per-query-type cache rate** — which query types benefit most
- **Cache latency savings** — total time saved by cache hits
- **Cache cost savings** — how much money cache saved

---

## Composite Score Bands

| Band | Score | Meaning |
|------|-------|---------|
| 🟢 Excellent | 85-100 | Production-ready. Fine-tune edge cases. |
| 🟡 Good | 70-84 | Working well. Some optimization opportunities. |
| 🟠 Fair | 55-69 | Functional but needs attention. |
| 🔴 Poor | 40-54 | Quality issues. Investigate root cause. |
| ⚫ Critical | <40 | Router needs significant work. |

## Usage

Calculate after every 100 queries or at least once per week:

```bash
a3m-router metrics          # Quick pulse
a3m-router metrics --full   # Full rubric with all dimensions
a3m-router metrics --export  # Raw JSON for analysis
```
