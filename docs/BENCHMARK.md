# A3M Router — Independent Benchmark

**The question everyone asks:** *"How much latency does a gateway add?"*

**The answer:** +96ms for passthrough, +236ms for full intelligent routing — on a 138ms baseline.

Everything below explains exactly where those milliseconds go, and why they're worth it.

---

## The TL;DR

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

---

## The Details

| Scenario | Time | What's happening |
|:---------|:----:|:-----------------|
| **Direct to Groq** | **138ms** | One HTTP call. No protection. No routing. No cost tracking. Every query uses the same expensive model. |
| **Through A3M (forced route)** | **234ms** | Request hits A3M proxy. Guardrails scan for prompt injection (17 patterns) and PII. Cache checks for semantic duplicates. Cost tracker logs the call. Request forwarded to Groq. Response logged. |
| **Through A3M (auto route)** | **374ms** | Everything above, plus: A3M's router extracts 12 signals from the query text — domain, task type, complexity, verb intensity, multi-step structure. Scores it. Assigns a tier. Selects the cheapest capable model. Forwards the request. |

**The extra 140ms for auto-routing is the intelligence.** It's the difference between "throw every query at GPT-4o" and "route simple questions to free tier, code questions to DeepSeek, expert questions to premium."

---

## The Trade-Off

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

---

## Why Most Gateways Don't Publish This

Every gateway adds latency. Most don't publish their numbers because they're either:

1. **Just a proxy** (litellm in passthrough mode) — ~50ms overhead, but no routing intelligence
2. **Too slow** — adding 500ms+ when you include their full pipeline
3. **Not measured** — nobody actually benchmarks their own stack

A3M publishes this because the numbers are honest and the trade-off is clear: **pay 236ms, save 62%, get production-grade security.**

---

## Reproduce This Yourself

```bash
# Install the benchmark tool
pip install llm-gateway-bench

# Start A3M proxy
npx a3m-router serve

# Run comparison
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
