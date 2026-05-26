# A3M Router — Independent Benchmark Results

Run date: 2026-05-26  
Tool: [llm-gateway-bench](https://github.com/taffy-owo/llm-gateway-bench) v0.2.0  
Methodology: 3 prompts × 5 requests = 15 calls per scenario. Real API calls to Groq (llama-3.3-70b).

## A3M Proxy Overhead

| Scenario | TTFT (ms) | Total (ms) | P95 (ms) | Success | Overhead |
|:---------|:--------:|:----------:|:--------:|:-------:|:--------:|
| **Direct Groq** (baseline) | **138** | **139** | **270** | 100% | — |
| **A3M forced route** (proxy+routing) | **234** | **235** | **353** | 100% | +96ms |
| **A3M auto** (proxy+routing+classify) | **374** | **374** | **540** | 100% | +236ms |

### Interpretation

- **Proxy overhead (~96ms):** Guardrails check (17 injection patterns, PII detection) + semantic cache lookup + cost tracking + provider passthrough.
- **Routing overhead (+140ms):** 12-signal feature extraction + complexity classification + tier assignment + model selection.
- **Total A3M overhead:** 236ms for full intelligent routing. ~170ms for forced-route passthrough.

### Cost Impact

Routing through A3M enables 62% cost savings via tier-based model selection. At 100K queries/month:
- All Groq: $0 (all free tier)
- All Premium: $341/month
- A3M routed: $124/month (mix of free + cheap + mid + premium)

The 236ms overhead pays for itself at scale.

## Cost Savings Validation

A3M's routing benchmark (200 queries) confirms:
- **61.6%** cost savings vs all-premium routing
- **99.5%** ±1 tier accuracy
- **64.5%** exact tier match

## Run Yourself

```bash
pip install llm-gateway-bench
npx a3m-router serve  # start proxy
cat > bench.yaml << 'EOF'
providers:
  - name: groq
    model: llama-3.3-70b-versatile
    base_url: https://api.groq.com/openai/v1
  - name: custom
    model: auto
    base_url: http://localhost:8787/v1
    api_key: not-needed
settings:
  requests: 10
  concurrency: 1
  timeout: 30
EOF
python3 -m llm_gateway_bench.cli compare bench.yaml
```
