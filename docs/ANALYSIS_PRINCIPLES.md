# A3M Router — Analysis Principles

These principles apply to every routing decision, performance analysis, and optimization recommendation. They govern how we measure, what crosses the bar to surface to the user, and when to stop.

---

## 1. Evidence Is the Bar

Every claim about routing performance must cite specific data from the actual router:

- Name the query type (trivial, simple, moderate, complex, expert)
- Cite the cost, latency, and provider for each routing decision
- If you don't have the data to support a claim, pull it before making the claim
- "Industry typically shows X" or "theory suggests" is not evidence
- When recommending a routing change, separately show the data that would falsify the recommendation if it existed
- "Looks slow" / "seems expensive" / "could be improved" is a draft, not a finding

When data is too thin to support a recommendation, say so explicitly. Don't paper over uncertainty.

---

## 2. STOP Conditions

The following conditions halt routing and surface a blocking error BEFORE any provider is called:

| Condition | Action |
|-----------|--------|
| **No providers configured** | STOP. Show setup wizard. Recommend `a3m-router setup` |
| **All API keys expired or missing** | STOP. List which keys are needed. Show env var names. |
| **Zero remaining budget** (budget cap hit) | STOP. Show spending summary. Offer to increase cap. |
| **Provider health check all red** | STOP. Show health report. Offer to retry after 60s. |
| **Circuit breaker open on all providers** | STOP. Show which providers are down. Show estimated recovery time. |
| **Rate limit exceeded on all available providers** | STOP. Show backoff time. Offer to queue query. |
| **Query contains flagged content** (PII, injection attempt, etc.) | STOP. Show guardrails violated. Do NOT route. |

Do NOT silently degrade — stop, explain why, and offer a path forward.

---

## 3. Statistical Significance Gate

Before reporting a routing accuracy improvement or degradation:

- **Minimum 100 queries** for any accuracy claim. Fewer than 100 ±1 tier hits is too noisy. Say "insufficient data" instead of reporting a number.
- **Minimum 50 queries per query type** for per-type accuracy breakdown. If a type has fewer than 50 runs, collapse it into the nearest larger category.
- **Minimum 7 days or 500 queries** before claiming a cost savings improvement. Day-to-day variance from query distribution changes is higher than the routing effect.
- **Minimum 14 days or 1000 queries** before comparing two routing configurations (e.g., keyword-only vs ML-assisted).

---

## 4. Never Route to an Untested Provider Without Fallback

When adding a new provider to the routing pool:

1. First test the provider via `a3m-router test <provider>` — must pass health check
2. Route only queries with complexity < 30 to the new provider for first 50 queries (proving phase)
3. After 50 queries with <10% error rate, promote to full routing pool
4. Always pair a new provider with a mature fallback

If a provider has no proven track record in this A3M installation, it must have:
- A verified API key (checked at startup)
- A health check pass within the last 15 minutes
- An active circuit breaker with <3 trips in the last hour

---

## 5. Confirmation Before Bulk Operations

Before routing more than 10 concurrent queries through a new configuration:

- Show the count, breakdown by query type, and expected cost
- Show the pre/post cost comparison if the change would affect routing
- Ask for confirmation before proceeding

Exception: Automated cache warming and health check pings do not require confirmation.

---

## 6. Change Tracking Requirement

Every routing decision must be logged with:

- Timestamp
- Query (hashed/no PII for privacy)
- Query type classification
- Selected provider
- Provider tier
- Actual cost
- Latency
- Cache hit/miss
- Error (if any)
- Fallback provider used (if any)

The audit log is stored in `~/.a3m-router/audit-log.ndjson` — one JSON object per line.

Never route without logging. If the audit log file cannot be written, log to stderr and surface a warning.

---

## 7. Signal-Failure Override

When a signal that normally contributes to routing decisions is unavailable:

| Missing Signal | Override Behavior |
|---------------|-------------------|
| **Provider health data** | Assume healthy. Do not penalize the provider. Issue warning. |
| **Cost data for a provider** | Use the provider's default cost tier. Issue warning. |
| **Historical accuracy data** | Use the model's global default accuracy. Issue warning. |
| **Cache** | Route as if cache miss. No penalty to the scoring. |
| **Budget enforcement data** | Use last-known budget snapshot. If none available, do not enforce budget. Issue warning. |

Do NOT fabricate data. Report the override explicitly: "Provider health unavailable — assumed healthy."

---

## 8. Read Correlates, Write Commits

- **Routing decisions are reads** — they select a provider but don't change the router's behavior
- **Configuration changes are writes** — adding/removing providers, changing weights, updating thresholds
- Every configuration change must be logged with old and new values
- Every configuration change must be reversible within 5 minutes
- Configuration changes should be tested with at least 10 queries before switching to production

---

## 9. Data Freshness Rules

| Data Type | Max Age Before Refresh | Behavior When Stale |
|-----------|----------------------|---------------------|
| Provider health | 60 seconds | Mark as untested (see rule 4) |
| Cost data | 24 hours | Use last-known, issue warning |
| RouterArena score | 7 days | Accept cached, prompt refresh |
| Model capability profiles | 30 days | Prompt refresh, use cached |
| Cache entries | Per TTL config | Evict, route normally |
| Budget state | 1 second | Block if over, allow if under |

---

## 10. When You're Unsure

- Surface uncertainty in the report. "Thin data" is better than a fabricated number.
- Ask one targeted question if it would change the recommendation materially. Don't ask for context the data already gives you.
- If routing quality depends on query distribution (which changes over time) and the distribution has shifted, name what changed and offer to re-profile the golden route set.

---

## Quick Reference: Decision Flow

```
Query arrives
  → Guardrails check (Rule 2)
  → Health check (Rule 4)
  → Budget check (Rule 2)
  → Signal-failure override check (Rule 7)
  → Cache lookup (Rule 1)
  → Complexity scoring
  → Provider selection (Rule 3)
  → Route & log (Rule 6)
  → Fallback if failure (Rule 4)
  → Return response or STOP (Rule 2)
  → Update metrics (Rule 1)
```
