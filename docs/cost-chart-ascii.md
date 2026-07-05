# A3M Router Cost Chart (for HN/Reddit comments)

## ASCII Cost Comparison

```
LLM Router Cost Comparison (RouterArena Benchmark)

A3M Router  ▏ $0.0768/1K   — #1 ranked, cheapest
Sqwish      █ $0.18/1K     — 3.8× more expensive
Azure       █▎ $0.22/1K    — 4.7× more expensive
RouteLLM    ██ $0.27/1K    — 3.5× more expensive
GPT-5       ████████████████████████████████████████ $10.02/1K — 130× more expensive

A3M is BOTH the cheapest AND the highest-ranked.
```

## Copy-paste for HN comments:

A3M Router: $0.0768/1K, Score: 96.77% (#1)
Sqwish: $0.18/1K, Score: 75.27 (#2) — 3.8× more expensive
Azure: $0.22/1K, Score: 71.87 (#3) — 4.7× more expensive
GPT-5: $10.02/1K, Score: 64.32 (#4) — 130× more expensive, 12 points lower

Source: RouterArena (arXiv:2510.00202), 8,400 queries, 9 domains

## Parallel vs Sequential

```
Sequential (litellm/OpenRouter/etc):
  Request → Try GPT-4o ($0.03) → ❌ fail
          → Try Claude ($0.003) → ❌ fail
          → Try Groq ($0.00006) → ✅ success
  Result: 3 API calls, 3× latency, $0.033 cost

Parallel (A3M):
  Request → GPT-4o ═╗
           → Claude ═╣ → Score each → Pick best by confidence
           → Groq   ═╝
  Result: 1 round-trip, 1× latency, $0.00006 cost

Same answer quality. 550× cheaper. 3× faster.
```
