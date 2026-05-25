# When to Use A3M Router

## Startup (5K–100K queries/month)

**Problem:** Unpredictable API bills. One viral feature = $2,500 GPT-4o bill overnight.

**Solution:** Hard budget caps + semantic cache. Auto-route simple queries to cheapest model.

**Savings:** $50–500/month

```bash
npx a3m-router serve --budget 50 --budget-period monthly
```

---

## Enterprise (1M+ queries/month)

**Problem:** Multi-team spend tracking. One team burns the shared budget. No reliability SLAs.

**Solution:** Per-team budgets, circuit breaker, health scoring, Prometheus metrics.

**Savings:** $10K+/month

```bash
npx a3m-router serve --per-team-budgets --metrics-port 9090
```

---

## Cost-Sensitive (High volume, low budget)

**Problem:** Everything routed to GPT-4o = broke by Tuesday.

**Solution:** Intelligent routing to cheapest capable model. Trivial → Groq/DeepSeek. Complex → GPT-4o.

**Savings:** 62% vs all-premium routing

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Summarize this"}]}'
```

---

## Self-Hosted / Privacy-First

**Problem:** Can't send user data to third-party API gateways (SOC2, HIPAA, GDPR).

**Solution:** Self-hosted MIT proxy. All data stays on your infra. Zero external dependencies.

---

## Multi-Region Deployment

**Problem:** Latency spikes for global users. Provider outages in specific regions.

**Solution:** Chinese + Western providers. Geo-aware routing. Automatic failover across regions.
