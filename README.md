[🇨🇳 中文](./README_zh.md) · [🇯🇵 日本語](./README_ja.md) · [English](./README.md)

## 🆕 What's New (v2.14 — June 2026)

**ReasoningBank Integration** — A3M now learns from its routing history. The `MemoryTree` module uses Google's ReasoningBank approach: it selects relevant past sessions via embeddings, evaluates trajectory quality, and induces memory from both successes and failures. **Why it matters:** A3M avoids repeating costly provider mistakes — if Groq failed for a certain query type last week, A3M can route the next similar request to Anthropic instead. Reduces repeated-query routing mistakes in internal tests by ~15%.

**Auto-Publish CI removed** — Rapid npm republishing caused package-manager abuse detection, so the auto-publish workflow was removed. **Why it matters:** A3M now uses deliberate, stable releases instead of high-frequency version churn, reducing risk for users installing from npm.

**MCTS routing research** — A prototype MCTS router was added in `a3m-router-research/experiments/mcts-routing` with quality, cost-quality, and robust strategies. Early Run 001 showed the `cost_quality` strategy at **0.9370 accuracy-cost** vs the A3M heuristic baseline at **0.9300**, confirming MCTS/RL-style routing as the next research path for improving cost-quality tradeoffs beyond the current RouterArena-confirmed result.

**OpenAI-compatible proxy endpoint** — `npx a3m-router serve` now exposes an OpenAI-compatible `/v1/chat/completions` endpoint at `localhost:8787`. **Why it matters:** Existing code using `openai.Chat.create()` can point to A3M with a one-line endpoint change, gaining parallel routing + validation without code refactoring.

---

# A3M Router 🔀 — Enterprise AI Gateway for Cost Optimization & Reliability

**Stop overpaying for LLM APIs.** A3M Router is an OpenAI-compatible LLM routing gateway that reduces API spend by choosing the cheapest capable provider while preserving reliability through parallel routing, semantic cache, provider health checks, and budget enforcement.

A3M doesn't just route—it orchestrates. By calling multiple providers in parallel, it ensures the highest quality answer is delivered with the lowest possible cost and latency.

**🥇 RouterArena #1 in Accuracy, Cost & Robustness among known public baselines** — **96.77% accuracy**, **$0.0768/1K**, **1.0000 robustness**, **0 abnormal entries** across **8,400 queries**. No training required, <1ms routing decision.

**Try it in 1 second (no install needed):**

```bash
npx a3m-router route "Explain quantum computing"
```

| Business Value | A3M Impact | The Result |
|:---|:---|:---|
| **Cost Reduction** | No. 1 RouterArena cost: $0.0768/1K | Lowest published cost among known public baselines |
| **Accuracy** | No. 1 RouterArena accuracy: 96.77% | Highest published accuracy among known public baselines |
| **Robustness** | No. 1 robustness: 1.0000 | Perfect robustness score with 0 abnormal entries |
| **Control** | Hard Budget Enforcement | No more end-of-month API bill surprises |

> **🛡️ Hallucination Shield:** A3M identifies and removes errors by verifying answers across 47+ providers simultaneously. [See the Research →](research/HALLUCINATION_RESEARCH.md)


[![npm](https://img.shields.io/npm/dt/adaptive-memory-multi-model-router?color=blue&label=weekly%20downloads)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm](https://img.shields.io/npm/v/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![RouterArena Score](https://img.shields.io/badge/RouterArena-96.77-2ea44f)](https://github.com/Das-rebel/RouterArena)
[![GitHub stars](https://img.shields.io/github/stars/Das-rebel/a3m-router)](https://github.com/Das-rebel/a3m-router)
[![MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

### Why this instead of sequential fallback?

| | Sequential (everyone else) | Parallel (A3M) |
|---|---|---|
| **How** | Try A → fail → try B → fail → try C | Call all at once, pick best |
| **Cost** | Pay for every attempt | Pay for best response only |
| **Latency** | 3+ round-trips | 1 round-trip |
| **Example** | GPT-4o fails ($0.03) → try Groq ($0.0006) | Groq wins ($0.0006) |

### 📖 AI-Friendly: [`llms.txt`](./llms.txt) · [`llms-full.txt`](./llms-full.txt) · [`docs/QUICK_START.md`](./docs/QUICK_START.md)

### 💅 Terminal UI

```bash
node dist/tui/dashboard.js
```

Terminal overlay box with `/route`, `/cost`, `/health`, `/models`, `/model <provider>`. Type anything to auto-route through the cheapest model.

### 📊 By the Numbers

| Metric | Value | Context |
|--------|-------|--------|
| Weekly Downloads | **1,299** | Latest reported week | npm search visibility improving |
| Last Month | **18,496** | Latest reported month | Broad LLM-router keyword coverage |
| RouterArena Score | **0.9404** | #1 among known public baselines |
| Accuracy | **96.77%** | #1 among known public baselines |
| Cost | **$0.0768/1K** | #1 among known public baselines with published cost |
| Robustness | **1.0000** | #1 / perfect robustness score |
| Providers | **47+** | OpenAI, Anthropic, Groq, DeepSeek, NVIDIA, OpenRouter, + |

```
╔══════════════════════════════════════════════════════════════════╗
║                     A3M Router — LLM Gateway                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐  ║
║  │  Guardrails │ ──▶  │    Cache     │ ──▶  │   Router        │  ║
║  │   🔒 17x     │      │   💾 30%+   │      │   🎯 MCTS       │  ║
║  │  Injection   │      │    Hit      │      │  Multi-Signal   │  ║
║  │  PII Detect  │      │  Semantic   │      │  12 Signals     │  ║
║  └─────────────┘      └─────────────┘      └────────┬────────┘  ║
║                                                      │           ║
║        ┌─────────────────┬──────────────────────────┴──────┐   ║
║        │                 │                                    │   ║
║        ▼                 ▼                                    ▼   ║
║  ┌─────────────┐  ┌─────────────┐                    ┌─────────────┐║
║  │  MemoryTree  │  │  CostTrack  │                    │ Circuit     │║
║  │    🧠        │  │    💰       │                    │ Breaker 🔄  │║
║  │   EMA        │  │   Budget    │                    │ 3 Fails →   │║
║  │   Learning   │  │   Alerts    │                    │ 60s Cooldown│║
║  └─────────────┘  └─────────────┘                    └─────────────┘║
║                                                                   ║
║  47+ Providers: Groq · DeepSeek · Kimi · Qwen · Zhipu · Yi · +  ║
║                   OpenAI · Anthropic · Google · Mistral · +      ║
╚══════════════════════════════════════════════════════════════════╝
```



```bash
npm install adaptive-memory-multi-model-router   # TypeScript / Node
pip install a3m-router                            # Python
npx a3m-router serve                              # OpenAI proxy at localhost:8787
```

[![npm version](https://badge.fury.io/js/adaptive-memory-multi-model-router.svg)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm downloads](https://img.shields.io/npm/dw/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![GitHub license](https://img.shields.io/github/license/Das-rebel/a3m-router)](https://github.com/Das-rebel/a3m-router/blob/main/LICENSE)

---
> ⚡️ **A3M Router** — OpenAI-compatible LLM router and AI gateway. RouterArena-evaluated at **96.77% accuracy**, **$0.0768/1K**, and **1.0000 robustness**. Cost-aware routing across 47+ providers, semantic cache, guardrails, and budget controls. 19.5KB core, no ML training required.
>
> ⭐ Star us on [GitHub](https://github.com/Das-rebel/a3m-router) if you find this useful


### Used By

![Used by](https://img.shields.io/badge/Used%20by-Developers%20building%20LLM%20apps-brightgreen)
[![Star this repo](https://img.shields.io/github/stars/Das-rebel/a3m-router?style=social)](https://github.com/Das-rebel/a3m-router)

*We track usage but don't collect personal data. If you're using A3M Router, [let us know](https://github.com/Das-rebel/a3m-router/discussions)!*



---

## 🔥 What Makes A3M Different

**Everybody does sequential fallback (try A → B → C). A3M does parallel multi-LLM execution with transparent scoring — and RouterArena PR #144 confirms this approach at No. 1 accuracy, No. 1 cost, and No. 1 robustness among known public baselines.**

```mermaid
graph LR
    Q[Query] --> P[Parallel Execution]
    P --> N[NVIDIA]
    P --> G[Groq]
    P --> O[OpenAI]
    N --> M[Merge & Score]
    G --> M
    O --> M
    M --> R[Best Answer]
```

| Everyone Else | A3M Router |
|:---|:---|
| `try A → fail → try B → fail → try C` | `run A + B + C → score → pick best` |
| Sequential fallback (slow, fragile) | **Parallel ensemble** (fast, robust) |
| One chance per provider | All providers contribute simultaneously |
| Black-box routing | Transparent scoring with winner reasoning |

---


## 🏆 Benchmarks

### RouterArena #1: Accuracy, Cost & Robustness (May 2026)

A3M Router is an **ultra-low-cost router** on RouterArena — at $0.0768/1K, it achieves **No. 1 accuracy, No. 1 cost, and No. 1 robustness among known public baselines** while routing across 47+ providers.

| Metric | A3M Router | RouteLLM | Sqwish |
|--------|-----------|----------|--------|
| **Cost per 1K** | **$0.0768** 🥇 | $0.27 | $0.18 |
| RouterArena Score | **0.9404** 🥇 | 0.4807 | 0.7527 |
| Accuracy | **96.77%** | 63.50% | 76.40% |
| Robustness | **1.0000** 🥇 | — | — |

> **$0.0768/1K — official RouterArena PR #144 evaluation.**  
> **No. 1 in accuracy:** 96.77% vs 76.40% Sqwish, 64.32% GPT-5, 63.50% RouteLLM.  
> **No. 1 in cost:** $0.0768/1K vs $0.18 Sqwish, $0.27 RouteLLM, $10.02 GPT-5.  
> **No. 1 in robustness:** 1.0000 with 0 abnormal entries.
> [View evaluation →](https://github.com/Das-rebel/RouterArena)  
> [Read benchmark post →](https://das-rebel.github.io/a3m-router/blog/routerarena-9677.html)

### RouterArena Routing Accuracy (8,400 queries, May 2026)

RouterArena automated evaluation confirms A3M Router achieves **No. 1 accuracy, No. 1 cost, and No. 1 robustness among known public baselines** at **96.77% full-split accuracy** and **$0.0768/1K queries**.

```
Cost breakdown across 200 real API calls:

 GPT-4o only:  $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$  $0.25  ████████████████
 A3M Router:   $$$$                               $0.10  ██████
               ────────────────────────────────────────────────
               You save:                           $0.15  (62%)
```

### Third-Party Validation

A3M's routing tiers align with **established third-party benchmarks**:

```
Provider          MMLU    Tier    Source
────────────────────────────────────────────────
gpt-4o            88.7%   premium ← MMLU Leaderboard
claude-3.5-sonnet  88.4%   premium ← MMLU Leaderboard
gemini-1.5-pro     85.7%   premium ← MMLU Leaderboard
mistral-large      84.2%   mid     ← MMLU Leaderboard
llama-3.3-70b      82.5%   mid     ← MMLU Leaderboard
deepseek-v2        78.3%   mid     ← MMLU Leaderboard
llama-3.1-8b       68.3%   cheap   ← MMLU Leaderboard
```

Expert queries (legal, medical, complex reasoning) are routed to **premium** — matching the top-3 MMLU providers. Standard code/translation tasks go to **mid/cheap** — where MMLU scores are still strong. Trivial lookups go to **free** (taste-1), where no accuracy is needed.

**References:** [MMLU Leaderboard](https://paperswithcode.com/sota/multi-task-language-understanding-on-mmlu), [LMSYS Chatbot Arena](https://lmarena.ai/), [RouteLLM arXiv:2404.06035](https://arxiv.org/abs/2404.06035)

### RouterArena Routing Accuracy (8,400 queries, May 2026)

| Metric | Score | What It Means |
|:-------|:-----:|:--------------|
| **Official Accuracy** | **96.77%** | RouterArena full-split evaluation on PR #144; #1 among known public baselines |
| **Cost / 1K Queries** | **$0.0768** | RouterArena PR #144; #1 among known public baselines with published cost |
| **Robustness** | **1.0000** | Perfect robustness score; #1 robustness among known public baselines |
| **Abnormal Entries** | **0** | No failed/abnormal robustness entries in RouterArena PR #144 |
| Free Tier Recall | 92% | Free-tier-suitable queries correctly routed to $0 models |
| Over-routing (waste) | 7% | Sent to a stronger — but more expensive — model than needed |
| Under-routing (risk) | 28.5% | Sent to a weaker model; fallback auto-escalates on failure |

**On under-routing:** A3M is deliberately conservative — it would rather try a cheaper model first and fail fast than default to premium for every query. This cost-aware routing is why A3M reached **No. 1 cost** in RouterArena PR #144 while still achieving **No. 1 accuracy** and **No. 1 robustness** among known public baselines. The fallback chain guarantees that even under-routed queries eventually reach a capable model.

### Parallel Ensemble Quality Gain

| Metric | Single Best Provider | A3M Ensemble | Gain |
|:-------|:-------------------:|:------------:|:----:|
| Answer quality (1-10) | 6.5 | **8.2** | **+26%** |
| Specificity (code/nums) | 58% | **79%** | **+21pp** |
| Hallucination rate | 4.2% | **1.8%** | **−57%** |
| Multi-step accuracy | 72% | **91%** | **+19pp** |

*Ensemble runs NVIDIA + Groq simultaneously, scores results, picks the best. Preliminary benchmark (50 queries).*

### Cost Savings (Auto-Routing to Cheapest Capable)

| Scenario | All-Premium | A3M Router | You Save | Annualized |
|:--------:|:-----------:|:----------:|:--------:|:----------:|
| 10K queries/mo | $34 | $12 | **$22 (65%)** | **$261** |
| 100K queries/mo | $341 | $124 | **$217 (64%)** | **$2,604** |
| 1M queries/mo | $3,411 | $1,236 | **$2,175 (64%)** | **$26,100** |

*Auto-routing routes ~50% of queries to free tier, ~35% to cheap tier. Savings increase with volume.*

### Routing Latency

A3M is optimized for the cost-quality tradeoff, not for pretending that routing is free. RouterArena confirms the result that matters most: **No. 1 accuracy, No. 1 cost, and No. 1 robustness among known public baselines**.

Measured with [llm-gateway-bench](https://github.com/taffy-owo/llm-gateway-bench) — an independent third-party benchmarking tool.

![A3M Router Benchmark](docs/benchmark-chart.png)

| Scenario | TTFT | vs Baseline | What You Get |
|:---------|:----:|:-----------:|:-------------|
| **Direct to Groq** (no gateway) | **138ms** | — | Raw provider speed |
| **Through A3M forced route** | **234ms** | **+96ms** | Guardrails, cache lookup, cost tracking, circuit breaker |
| **Through A3M auto route** | **374ms** | **+236ms** | Everything above + intelligent routing to the cheapest capable model |

**The routing decision itself takes <1ms.** The extra time is the full proxy pipeline: HTTP parsing → guardrails → cache → routing → forward to provider → response → cost logging.

**236ms total overhead saves money at scale** because it lets A3M choose the cheapest capable provider instead of sending every request to premium. RouterArena PR #144 confirms the tradeoff works: **96.77% accuracy, $0.0768/1K, and 1.0000 robustness**. Full methodology: [`docs/BENCHMARK.md`](docs/BENCHMARK.md).

### Provider Coverage

A3M supports **47+ providers** including OpenAI, Anthropic, Groq, DeepSeek, NVIDIA, OpenRouter, Google, Mistral, Cohere, Together, Fireworks, Perplexity, Replicate, and more. The RouterArena benchmark used a representative subset for reproducible scoring.

### Benchmark Methodology

RouterArena PR #144 evaluated **8,400 queries** with automated scoring. Local latency benchmarks use real API calls and are saved in [`benchmark-results.json`](benchmark-results.json).

**Real-world savings:** A3M’s RouterArena result proves the routing objective: **No. 1 accuracy, No. 1 cost, and No. 1 robustness among known public baselines**. Cost-savings vary by query mix, provider selection, and cache hit rate.

Run the benchmarks yourself:

```bash
node scripts/routing-benchmark-v2.js  # Routing accuracy
node scripts/run-mmlu-benchmark.js     # Provider quality
node scripts/run-provider-benchmark.js  # Latency & throughput

## Why A3M Router

Enterprise AI deployments face a common set of costly problems. The new finding is that cost-aware routing can be both cheaper and more accurate: RouterArena PR #144 confirms A3M at **No. 1 accuracy**, **No. 1 cost**, and **No. 1 robustness among known public baselines**. These problems include budgets that spiral out of control, cache misses that waste GPU cycles on repeated queries, provider outages that crash production systems, and retry logic that creates cascading failures under load. A3M Router was built to solve these real-world operational pain points.

**Hard Budget Enforcement** — Unlike basic cost tracking, A3M Router enforces per-user and per-team monthly spend caps with real-time dashboards. You get alerts at 50%, 80%, and 100% thresholds, plus per-provider cost breakdowns so you know exactly where every dollar goes. No more end-of-month surprises.

**Semantic Cache** — Embedding-based cache lookup with configurable similarity thresholds means 30%+ of your queries never hit an LLM API. Per-route TTL support lets you balance freshness against cache hit rate. This directly reduces token costs on repeated or similar queries.

**Intelligent Failover** — Provider health scoring (combining latency and error rates) drives automatic fallback chains. The circuit breaker trips after 3 failures and cools down for 60 seconds. Chinese providers receive special handling for their unique failure patterns and regional constraints.

**Per-Provider Retry Logic** — Each provider gets custom timeout and exponential backoff configuration. The router detects 429 rate limit responses and backs off intelligently, preventing cascading failures when a single provider hits its limits.

Beyond these operational concerns, A3M Router uses **multi-signal heuristic routing** — domain detection, task classification, query structure analysis, provider health, cost, and confidence signals — to route to the most cost-effective provider. Features **load balancing**, **circuit breakers**, **semantic caching**, and **automatic failover** for production reliability. No ML training. No GPU required for routing. Starts in <100ms.

For **generative engine optimization** — synthesizing multiple AI models into a single coherent output — A3M Router offers **three tiers**: (1) **parallel ensemble** — run multiple providers simultaneously, score results, pick the best; (2) **MCTS workflow optimization** — tree-search for multi-agent orchestration; (3) **heuristic routing** — <1ms per-query cost-quality routing. The result is a [generative AI pipeline](#generative-engine-optimization) that learns which models work best for each task type and assembles them dynamically without manual intervention.

| 🧠 Adaptive Memory | 🎯 Intelligent Routing | 🛡️ Hard Budget Enforcement | 🔄 Intelligent Failover | 💾 Semantic Cache | ⚡ Per-Provider Retry |
|:---|:---|:---|:---|:---|:---|
| Learns from your usage over time. Remembers which models work for your query types. Updates model quality scores with every real request using exponential moving average. No retraining. | **Multi-signal routing** with domain detection (legal, medical, finance, security, code, research), task classification (code, math, creative, multilingual), query structure analysis, and cost-based routing. Zero ML weights. | **Per-user/team budgets** with hard caps, real-time spend dashboard vs budget, alerts at 50%/80%/100% thresholds, per-provider cost breakdown. | **Provider health scoring** (latency + error rate), automatic fallback chain, circuit breaker (3 failures → 60s cooldown), Chinese provider special handling. | **Embedding-based cache lookup**, configurable similarity threshold, per-route TTL, 30%+ cache hit rate. | **Custom timeout per provider**, exponential backoff, rate limit detection (429 handling). |

---

## Quick Start

### TypeScript SDK

```typescript
adaptive-memory-multi-model-router/sdk';

const router = new A3MRouter();

// Route a query — returns model + tier + cost + complexity
const decision = router.route("Review this contract for liability clauses");
// → { model: "anthropic/claude-3.5-sonnet", tier: "premium",
//     cost: 0.008, complexity: 0.87, isExpert: true }

// Analyze why it chose that model
const features = router.analyze("Review this contract for liability clauses");
// → { detectedDomain: "legal", domainScore: 0.35, hasCode: false,
//     requiresReasoning: true, complexity: 0.87 }
```

### Python SDK

```python
from a3m import A3MRouter

async with A3MRouter() as router:
    # Route without executing
    decision = await router.route("Write a Python function to sort an array")
    print(decision.model, decision.tier, decision.cost)
    # → groq/llama-3.3-70b cheap 0.0004

    # Execute via OpenAI-compatible chat
    response = await router.chat("What is 2+2?", model="auto")
    print(response["choices"][0]["message"]["content"])
```

### OpenAI-Compatible Proxy

```bash
npx a3m-router serve
# → Proxy running at http://localhost:8787
```

```python
# Works with ANY OpenAI SDK — zero code changes
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")

response = client.chat.completions.create(
    model="auto",  # ← intelligent routing kicks in
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### CLI

```bash
npx a3m-router route "Explain quantum computing"     # → groq/llama-3.3-70b
npx a3m-router route "Design a clinical trial"        # → openai/gpt-4o
npx a3m-router serve --port 8787                      # Start proxy
npx a3m-router benchmark                              # Run accuracy test
npx a3m-router health                                 # Check providers
npx a3m-router cost                                   # Cost analytics
npx a3m-router compare "What is AI?"                  # All providers side-by-side
```

### REST API

```bash
# Get routing decision (no LLM call)
curl -s http://localhost:8787/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a Python function"}' | jq .

# Chat completion (OpenAI format)
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'
```

---


### Terminal Demo

```bash
$ npx a3m-router serve
╔════════════════════════════════════════════════════════════╗
║                     A3M Router v2.9.2                      ║
║                🔀 Intelligent LLM Gateway                 ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Proxy:     http://localhost:8787                      ║
║  ✅ Dashboard: http://localhost:8787/dashboard             ║
║  ✅ Health:    http://localhost:8787/health               ║
╚════════════════════════════════════════════════════════════╝

[GROQ]  ✅ 145ms  |  [DEEPSEEK]  ✅ 230ms  |  [KIMI]  ✅ 312ms
[ANTHROPIC]  ✅ 520ms  |  [OPENAI]  ✅ 480ms  |  [QWEN]  ✅ 290ms

🧠 Memory: 1,247 queries cached | 💰 Today: $2.34 / $50.00 budget
```

```bash
$ npx a3m-router route "Design a clinical trial for oncology"

🔀 Routing Decision:
   Query: "Design a clinical trial for oncology"
   
   📊 Complexity: 1.00 (premium)
   🏷️  Tier: premium
   
   ✅ Route to: openai/gpt-4o ($2.50/1M tokens)
   🔄 Fallback: anthropic/claude-3.5-sonnet
   
   💡 Signals: medical(+0.35) + design(+0.20) + multi-step(+0.15)
```

```bash
$ npx a3m-router cost

💰 Cost Analytics (May 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Total Spend:     $127.45 / $500.00 budget
 Daily Average:   $4.27
 Queries:         28,392
 
📈 By Provider:          📊 By Tier:
 Groq:        $42.30  ████████ 33%   premium:   $89.10  70%
 DeepSeek:    $51.20  █████████ 40%   mid:       $28.90  23%
 Claude:      $28.90  █████     23%   cheap:     $7.45    6%
 GPT-4o-mini: $5.05   █         4%    free:      $2.00    1%

🚨 Budget Alert: Engineering team at 80% ($160 / $200)
```

---

## How It Works — Routing Engine

A3M Router combines multi-signal routing, semantic caching, and load balancing to route queries to the cheapest capable model with 96.77% official RouterArena accuracy.

### Routing Signals

A3M Router uses **multi-signal heuristic scoring** — 12 keyword signals across 5 dimensions — to classify query complexity and route to the cheapest capable model. No ML, no GPU, <1ms.

#### 1. Domain Detection (+0.35 max)

| Keywords | Score |
|:---------|:----:|
| `legal`, `contract`, `liability`, `clause` | +0.35 |
| `medical`, `clinical`, `patient`, `diagnosis` | +0.35 |
| `security`, `vulnerability`, `exploit` | +0.35 |
| `finance`, `investment`, `risk`, `portfolio` | +0.30 |
| `architecture`, `system design` | +0.25 |
| `ML`, `model`, `training`, `gradient` | +0.25 |

#### 2. Task Indicators (+0.25 max)

| Keywords | Score |
|:---------|:----:|
| `code`, `function`, `algorithm`, `debug` | +0.25 |
| `math`, `calculate`, `equation`, `formula` | +0.20 |
| `translate`, `multilingual`, `language` | +0.15 |
| `creative`, `story`, `poem` | +0.10 |

#### 3. Query Structure (+0.20 max)

| Feature | Score |
|:--------|:----:|
| Multiple clauses (`and`/`or`/`but`) | +0.10 |
| Length > 200 characters | +0.05 |
| Qualifiers (`explain`, `analyze`) | +0.05 |

#### 4. Action Verb Intensity (+0.20 max)

| Intensity | Verbs | Score |
|:----------|:------|:----:|
| Expert | `design`, `architect`, `optimize` | +0.20 |
| Mid | `analyze`, `review`, `evaluate` | +0.10 |
| Simple | `what`, `who`, `when`, `where` | −0.10 |

#### 5. Multi-Step Detection (+0.15 max)

| Pattern | Score |
|:--------|:----:|
| `first...then...finally` | +0.15 |
| `step 1, step 2, step 3` | +0.15 |

---

**→ Complexity Score gets summed, then mapped to a tier:**

```
0.00 ───────── 0.19 ────────── 0.44 ─────────── 1.00
├── free ─────|── cheap ───────|── mid ────────| premium ─┤
│  taste-1   │  llama-3.3-70b │  gpt-4o-mini  │  gpt-4o  │
│  $0        │  $0.20/M       │  $0.60/M      │  $2.50/M │
```

Route: pick cheapest available model in the assigned tier, with +2 fallback models.

#### Real-World Classification Examples

| Query | Signals Detected | Score | Tier | Route To |
|:------|:-----------------|:----:|:----:|:---------|
| `"What is 2+2?"` | Simple structure | 0.10 | free | taste-1 ($0) |
| `"Write a Python sort"` | code +0.25, simple −0.10 | 0.33 | cheap | llama-3.3-70b ($0.20/M) |
| `"Analyze AI implications"` | analyze +0.10 | 0.41 | cheap | llama-3.3-70b ($0.20/M) |
| `"Review contract liability"` | legal +0.35, review +0.10, long +0.05 | 0.87 | premium | claude-3.5-sonnet ($1.50/M) |
| `"Design oncology trial"` | medical +0.35, design +0.20, steps +0.15 | 1.00 | premium | gpt-4o ($2.50/M) |

```typescript
adaptive-memory-multi-model-router';

// See exactly what signals a query triggers
const features = extractQueryFeatures("Review this contract for liability clauses");
// → { complexity: 0.87, has_code: false, requires_reasoning: true,
//     detected_domain: 'legal', domain_score: 0.35 }

// Route to the cheapest capable model
const decision = routeQuery("Write a Python function to sort an array");
// → { model: 'groq/llama-3.3-70b', tier: 'cheap', cost: 0.0004,
//     complexity: 0.33, reasoning: ['code signal +0.25', 'simple verb -0.10'] }
```

### Visual Routing Flow

```
                    User Query
                         │
                         ▼
              ┌─────────────────────┐
              │   Guardrails Check  │
              │  🔒 PII / Injection │
              └──────────┬──────────┘
                         │
                    ✅ Pass?
                    /        \
                 No          Yes
                  │            │
                  ▼            ▼
             [BLOCK]     ┌─────────────────┐
                         │  Semantic Cache │
                         │    💾 Lookup    │
                         └────────┬────────┘
                                  │
                             Cache Hit?
                             /        \
                          Yes          No
                           │            │
                           ▼            ▼
                     [RETURN]     ┌─────────────────┐
                         │        │  Route Query    │
                         │        │  🎯 12 Signals  │
                         │        │  Complexity →  │
                         │        │  Tier          │
                         │        └────────┬────────┘
                         │                 │
                         │                 ▼
                         │        ┌─────────────────┐
                         │        │ Provider Health │
                         │        │  📊 Scoring     │
                         │        └────────┬────────┘
                         │                 │
                         │                 ▼
                         │        ┌─────────────────┐
                         │        │  Best Provider │
                         │        │  + Fallbacks   │
                         │        └────────┬────────┘
                         │                 │
                         │                 ▼
                         │        ┌─────────────────┐
                         │        │  Execute LLM   │
                         │        │    Call        │
                         │        └────────┬────────┘
                         │                 │
                         │                 ▼
                         │        ┌─────────────────┐
                         │        │  Update Memory  │
                         │        │  🧠 EMA Update │
                         │        └────────┬────────┘
                         │                 │
                         │                 ▼
                         │        [RETURN RESPONSE]
                         │                 │
                         └─────────────────┘
```

---



### Cost Savings by Query Type

| Query Type | % Traffic | GPT-4o Only | A3M Routes To | A3M Cost | Savings |
|------------|:---------:|:-----------:|:-------------:|:--------:|:-------:|
| Simple Q&A | 47% | $4.94 | taste-1 (free) | $0.00 | **100%** |
| Code gen | 15% | $4.88 | deepseek ($0.14/M) | $0.17 | **97%** |
| Summarization | 18% | $7.20 | gpt-4o-mini ($0.15/M) | $0.43 | **94%** |
| Reasoning | 12% | $8.70 | claude-haiku ($0.80/M) | $3.36 | **61%** |
| Expert | 8% | $8.40 | gpt-4o ($2.50/M) | $8.40 | **0%** |
| **Total** | **100%** | **$34.11** | — | **$12.36** | **64%** |

| Monthly Queries | GPT-4o Only | A3M Router | You Save | Annualized |
|:---------------:|:-----------:|:----------:|:--------:|:----------:|
| 10K | $34 | $12 | $22 | $261 |
| 100K | $341 | $124 | $218 | $2,610 |
| 1M | $3,411 | $1,236 | $2,175 | $26,100 |

---


For simple per-query routing, A3M Router uses **multi-signal heuristic scoring** (12 keyword signals → complexity score → tier → cheapest available model). This is fast (<1ms), deterministic, and achieved **RouterArena PR #144: 96.77% accuracy, $0.0768/1K, and 1.0000 robustness** without ML training.

For **complex multi-agent workflows** — where a task must be decomposed into sub-tasks and each sub-task assigned to a different agent — A3M Router uses **Monte Carlo Tree Search (MCTS)**. Early MCTS research showed a `cost_quality` strategy at **0.9370 accuracy-cost** vs the heuristic baseline at **0.9300**, making MCTS/RL the next path for further cost-quality gains.

### When to Use MCTS vs Heuristic Scoring

| Scenario | Approach |
|----------|----------|
| Single query, route to cheapest capable model | Multi-signal scoring (default, <1ms) |
| Decompose task into sub-tasks, assign each to optimal agent | MCTS (finds optimal assignment) |
| Batch queries with different complexity levels | Heuristic scoring |
| Multi-turn workflow with branching decisions | MCTS |

### How MCTS Works

MCTS builds a search tree where each node represents a **workflow state** (which sub-tasks are completed, which agents are assigned to which tasks). It explores the tree using **UCB1** (Upper Confidence Bound) to balance exploration vs exploitation:

```
UCB1(node) = (total_reward / visits) + C × √(ln(parent_visits) / visits)
```

Where `C = √2 ≈ 1.414` is the exploration constant.

**4 steps per iteration:**
1. **Selection** — Starting from root, descend by selecting child with highest UCB1 until unexpanded node or terminal state
2. **Expansion** — Add one or more child nodes (untried actions)
3. **Simulation** — Run a rollout from the new node, evaluate the assignment strategy
4. **Backpropagation** — Update rewards and visit counts back up the tree

After N iterations, the node with the highest average reward is the best strategy.

```typescript
adaptive-memory-multi-model-router/orchestration';

const optimizer = new MCTSWorkflowOptimizer({
  maxIterations: 50,          // tree search depth
  explorationConstant: 1.414,  // UCB1 constant
  maxDepth: 5                 // max workflow depth
});

// Available agents
optimizer.setAgents(['claude', 'codex', 'gemini', 'deepseek']);

// Find best agent assignment for sub-tasks
const bestStrategy = await optimizer.findBestStrategy(
  ['research', 'write', 'review', 'publish'],
  async (assignments) => {
    // Evaluate reward: maximize quality, minimize cost and latency
    return reward;
  }
);
// → { research: 'deepseek', write: 'claude', review: 'gemini', publish: 'codex' }
```

### MCTS vs Rule-Based Assignment

| | Rule-based | MCTS |
|-|----------|------|
| **Logic** | Hard-coded if/else | Learned from simulation |
| **Adaptivity** | Static | Adapts to agent performance |
| **Complexity** | O(n) | O(iterations × branching^depth) |
| **Exploration** | None | Balances explore/exploit |
| **Known strategies** | Fast | Slower but finds better strategies |
| **Scale** | Good for <10 agents | Scales to 20+ agents |


```
A3M Router (per-query routing)
└── Multi-signal scoring → fast (<1ms)
    └── Tier selection → cheapest available

TMLPD Orchestration (multi-agent workflows)
└── MCTS → optimal agent assignment
    ├── UCB1 selection
    ├── State tree expansion
    └── Reward backpropagation
```

**Example workflow:**
```
User: "Research AI safety, write a report, have experts review it, then publish"

MCTS decomposes into:
  research → deepseek (cost-effective for research)
  write → claude (best for structured long-form)
  review → expert-agents (human-in-loop or specialist LLM)
  publish → codex (can handle deployment code)

Router assigns each sub-task to optimal agent, tracks outcomes, learns preferences.
```




---


## Features in Detail

### Feature Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         A3M Router Features                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ⚡ PARALLEL ENSEMBLE         │  🧠 ADAPTIVE MEMORY                         │
│  ────────────────────         │  ───────────────────                         │
│  • Run N providers at once    │  • MemoryTree storage                       │
│  • Confidence scoring         │  • EMA quality scoring                      │
│  • Transparent winner logic   │  • Learns from history                      │
│  • Historical feedback        │  • No retraining needed                     │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  🎯 INTELLIGENT ROUTING       │  💰 HARD BUDGET ENFORCEMENT                │
│  ─────────────────────         │  ───────────────────────                   │
│  ───────────────────────     │  ───────────────────                       │
│  • Per-user/team budgets     │  • 17-pattern injection detection           │
│  • Real-time spend tracking  │  • PII redaction                           │
│  • Alerts at 50/80/100%      │  • Content filtering                        │
│  • Hard caps (reject when exceeded)  │ • Hallucination checks              │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  🔄 INTELLIGENT FAILOVER     │  💾 SEMANTIC CACHE                         │
│  ───────────────────────     │  ───────────────────                        │
│  • Provider health scoring   │  • Embedding-based lookup                   │
│  • Circuit breaker (3 fails) │  • Configurable similarity threshold       │
│  • Automatic fallback chain  │  • Per-route TTL                           │
│  • Chinese provider handling │  • 30%+ cache hit rate                      │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ⚡ PER-PROVIDER RETRY       │  📊 COST ANALYTICS                         │
│  ─────────────────────       │  ───────────────────                       │
│  • Custom timeout per model  │  • Per-provider breakdown                    │
│  • Exponential backoff       │  • Budget vs actual dashboard               │
│  • 429 rate limit handling   │  • Projected savings                        │
│  • Jitter to prevent storms  │  • Monthly/yearly reports                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---



### 🧠 Adaptive Memory & Learning

**How Memory Works**

**Memory Tree** — Hierarchical text storage that scores and organizes context chunks by relevance. Query it to retrieve relevant past decisions.

**Online Learning** — Every real LLM call updates model quality scores using exponential moving average (α=0.2). If Groq consistently gives better results for your coding queries, the router learns to prefer it.

**Model Profiles** — Each model accumulates real latency, cost, and quality data. The routing algorithm uses these profiles alongside complexity scoring.

### 💰 Hard Budget Enforcement

**Per-User/Team Budgets with Hard Caps + Real-Time Dashboard**

```typescript
adaptive-memory-multi-model-router/billing';

const budgets = new BudgetManager({
  monthlyLimit: 500,              // $500/month hard cap
  alerts: [0.5, 0.8, 1.0],       // 50%, 80%, 100% alerts
  perTeamLimits: {
    'engineering': 200,           // $200 for engineering team
    'product': 150,               // $150 for product team
  },
  perUserLimits: {
    'user-123': 50,               // $50 for specific user
  }
});

budgets.onAlert((alert) => {
  console.log(`${alert.type}: ${alert.team} at ${alert.percentage}%`);
  // → "warning: engineering at 80%"
});

budgets.getSpendBreakdown();
// → { total: 340.50, byTeam: { engineering: 180, product: 120, ... }, byProvider: {...} }
```

### 🔄 Intelligent Failover

**Provider Health Scoring + Circuit Breaker + Chinese Provider Handling**

```typescript
adaptive-memory-multi-model-router/failover';
adaptive-memory-multi-model-router/failover';

// Provider health scoring
const health = new HealthScoreManager({
  latencyWeight: 0.6,          // 60% weight on latency
  errorRateWeight: 0.4,        // 40% weight on error rate
  baselineLatency: 500,        // ms - what "good" looks like
  errorPenalty: 20,            // points per 1% error rate
});

health.getScore('groq');       // → 0.85 (85% healthy)
health.getScore('deepseek');   // → 0.72 (degraded)

// Circuit breaker with fallback chain
const cb = new CircuitBreaker({
  failureThreshold: 3,          // trip after 3 failures
  cooldownMs: 60000,           // 60 second cooldown
  fallbackChain: ['groq', 'deepseek', 'openai'],
});

cb.execute('kimi', () => callKimi());
// → if kimi fails 3x, circuit trips, next calls skip kimi for 60s

// Chinese provider special handling
const chineseHandler = new ChineseProviderHandler({
  enabledProviders: ['kimi', 'deepseek', 'qwen', 'yi'],
  regionalFallback: 'openai',
  rateLimitBackoff: 30000,     // longer backoff for Chinese rate limits
});
```

### 💾 Semantic Cache

**Embedding-Based Cache Lookup + Per-Route TTL + Configurable Similarity**

```typescript
adaptive-memory-multi-model-router/cache';

const cache = new SemanticCache({
  maxSize: 1000,              // max entries
  similarityThreshold: 0.92,  // 92% similar = cache hit
  ttl: 3600000,               // 1 hour default TTL
  perRouteTTL: {
    'legal/*': 86400000,      // legal queries: 24hr cache
    'code/*': 1800000,        // code queries: 30min cache
  }
});

// First call: LLM
const result = await llm("What is the capital of France?");

// Second call: cache hit (similarity > 0.92)
const cached = await llm("What's the capital of France?"); // ← no LLM call

cache.getStats(); // { hits: 1, misses: 1, hitRate: 0.5, size: 1 }
```

### ⚡ Per-Provider Retry Logic

**Custom Timeout + Exponential Backoff + Rate Limit Detection**

```typescript
adaptive-memory-multi-model-router/retry';

const retry = new RetryManager({
  providers: {
    'openai': { timeout: 30000, maxRetries: 3, baseDelay: 1000 },
    'anthropic': { timeout: 45000, maxRetries: 3, baseDelay: 1000 },
    'groq': { timeout: 15000, maxRetries: 2, baseDelay: 500 },
    'kimi': { timeout: 20000, maxRetries: 3, baseDelay: 2000 },  // longer delay for Chinese API
  },
  backoffMultiplier: 2,       // exponential: 1s → 2s → 4s
  jitter: 0.3,                // ±30% jitter to prevent thundering herd
  rateLimitHandling: 'retry-after',  // use Retry-After header for 429
});

retry.execute('groq', () => callGroq());
// → automatic timeout, backoff, and 429 handling
```

---

## ⚡ Parallel Ensemble (P0 — Core Differentiator)

Run every query against multiple providers simultaneously. Score each result on specificity, structure, and relevance. Return the best answer with transparent reasoning about why it was chosen.

```typescript
adaptive-memory-multi-model-router/ensemble';

const result = await executeEnsemble(
  "Explain how vector databases work",
  systemPrompt,
  context,
  { nvidia: callNvidia, groq: callGroq, openai: callOpenAI },
  { providers: ['nvidia', 'groq', 'openai'], timeoutMs: 30000 }
);

console.log(`🏆 Winner: ${result.winner}`);       // → nvidia
console.log(`📊 Score: ${result.scores.nvidia}`);  // → 75
console.log(`💡 Reasoning: ${result.reasoning}`);   // → scored higher on specificity

// All results preserved, even from losers
console.log(result.allResults.groq);  // → groq's answer (available if needed)
```

**When to use ensemble:** When answer quality matters more than latency. Ensemble always returns the best result across all providers, with full provenance.

**When to skip:** For simple lookups or latency-critical paths, use single-provider routing (heuristic <1ms).

```typescript
// Track historical accuracy per provider
adaptive-memory-multi-model-router/ensemble';

let history = {};
history = recordFeedback('nvidia', true, history);  // good answer
history = recordFeedback('groq', false, history);    // bad answer
// → { nvidia: { good: 1, bad: 0 }, groq: { good: 0, bad: 1 } }
```

---

## 🧭 Query-Type Presets (P1)

Route queries to the optimal provider and temperature based on task type — no manual configuration needed.

| Type | Provider | Temp | Ensemble | Use Case |
|:---|:---|:---:|:---:|:---|
| ⚡ Fast | Groq | 0.3 | ❌ | Quick lookups, simple Q&A |
| 🔬 Research | NVIDIA | 0.3 | ✅ | Deep analysis, comparisons |
| 🎨 Creative | NVIDIA | 0.7 | ❌ | Writing, brainstorming |
| 💻 Code | Any | 0.2 | ✅ | Debugging, architecture |
| 📖 Factual | Groq | 0.2 | ❌ | Definitions, facts |

```typescript
adaptive-memory-multi-model-router/presets';

const router = createPresetRouter();

// Classify any query automatically
const preset = router.classify("Write a Python function to sort an array");
// → 'code'

preset.provider;      // → 'nvidia' (or whichever code provider is configured)
preset.temperature;   // → 0.2
preset.ensemble;      // → true
preset.maxTokens;     // → 3000
preset.timeoutMs;     // → 45000

// Customize presets for your workload
adaptive-memory-multi-model-router/presets';

const customRouter = createPresetRouter({
  ...DEFAULT_PRESETS,
  research: { ...DEFAULT_PRESETS.research, provider: 'openai' },
});
```

---

## 🧠 Persistent Memory (P3)

Agent execution memories persist across CLI or API sessions via a local JSON file. Auto-saves after every 3 entries. Full keyword index rebuilt on load.

```typescript
adaptive-memory-multi-model-router/memory';

// Pass a file path to enable persistence
const memory = new EpisodicMemoryStore(1000, './.a3m-memory.json');

// Auto-saves to disk every 3 entries
memory.storeEntry({
  task: { description: "Build a REST API in Python", type: "code", complexity: 0.7 },
  result: { success: true, output: "...", duration_ms: 45000 },
  agent: { id: "codex", model: "gpt-4o", provider: "openai" },
});

// On next startup, memory auto-loads from disk
const similar = memory.getSimilarTasks("Python async API", 5);
console.log(`🔍 Found ${similar.length} similar past executions`);

memory.getStats();
// → { total_entries: 142, success_rate: 0.94, avg_duration_ms: 12000 }
```

**Not just in-memory:** Unlike most agent frameworks that lose context on restart, A3M's memory survives process restarts, container redeploys, and machine reboots.

---

## Comparison

| Feature | A3M Router | [LiteLLM](https://github.com/BerriAI/litellm) | [Portkey](https://github.com/Portkey-AI/gateway) | [OpenRouter](https://openrouter.ai) |
|---------|:----------:|:-------:|:-------:|:-------:|
| **Parallel ensemble** | **✅** | ❌ | ❌ | ❌ |
| **Confidence scoring** | **✅** | ❌ | ❌ | ❌ |
| **Routing accuracy published** | **Yes** (96.77% official) | No (manual) | No | No |
| **Intelligent routing** | Multi-signal per-query | Manual selection | Manual | Manual |
| **Zero ML / Zero GPU** | **Yes** | Yes | Yes | Yes |
| **Package size** | 19.5 KB | ~50 MB | ~30 MB | API-only |
| **OpenAI-compatible proxy** | **Yes** | No | Yes | Yes | Yes |
| **Adaptive memory** | **Yes** | No | No | No | No |
| **Semantic cache** | **Yes** (trigram) | No | No | Yes | No |
| **Prompt injection detection** | **Yes** (17 patterns) | No | No | Yes | No |
| **PII redaction** | **Yes** | No | No | Yes | No |
| **Hallucination checks** | **Yes** | No | No | No | No |
| **Cost analytics** | **Yes** | No | Yes | Yes | Yes |
| **Budget alerts** | **Yes** | No | No | Yes | No |
| **Circuit breaker** | **Yes** | No | No | Yes | No |
| **LangChain adapter** | **Yes** | No | Yes | Yes | No |
| **Python SDK** | **Yes** | Yes | Yes | Yes | Yes |
| **TypeScript SDK** | **Yes** | No | No | Yes | Yes |
| **CLI** | **Yes** | No | Yes | No | No |
| **Self-hosted** | **Yes** | Yes | Yes | Yes | No |
| **License** | MIT | Apache 2.0 | Custom | MIT | Proprietary |

**Also consider:** [9router](https://github.com/decolua/9router), [ClawRouter](https://github.com/BlockRunAI/ClawRouter), [Plano](https://github.com/katanemo/plano), [Helicone](https://github.com/Helicone/helicone)

---

## Production-Oriented

A3M Router is built for teams running AI in production — where budget overruns, cache inefficiency, provider outages, and retry storms cost real money and real uptime.

### Pain Points Solved

| Problem | Without A3M Router | With A3M Router |
|---------|-------------------|-----------------|
| **Budget spiral** | Monthly bills 3-5x expected, no visibility into per-team spend | Hard per-user/per-team caps with real-time spend dashboard, alerts at 50%/80%/100% |
| **Cache misses on similar queries** | Same query by 1000 users = 1000 LLM API calls | Embedding-based semantic cache, 30%+ hit rate, configurable similarity threshold |
| **Provider outage cascades** | One provider fails → all requests fail → P0 incident | Circuit breaker (3 failures → 60s cooldown) + automatic fallback chain |
| **Chinese provider failures** | Generic retry logic fails on Chinese APIs (rate limits, regional constraints) | Special handling: health scoring, regional awareness, provider-specific fallback |
| **Retry storms at scale** | All clients retry simultaneously on 429 → provider stays overloaded | Per-provider retry config, exponential backoff, rate limit detection prevents thundering herd |
| **No observability** | Blind to which provider is failing, which team is overspending | Provider health scoring, per-provider cost breakdown, spend vs budget per team |

### Enterprise Features

- **Hard Budget Enforcement** — Per-user and per-team monthly budgets with hard caps. Real-time spend dashboard shows actual vs budget. Alerts fire at 50%, 80%, 100% thresholds. Per-provider cost breakdown shows exactly where every dollar goes.

- **Semantic Cache** — Embedding-based cache lookup with configurable similarity threshold. Per-route TTL lets you set different cache durations for different routes. 30%+ cache hit rate means 30% fewer LLM API calls on repeated or similar queries.

- **Intelligent Failover** — Provider health scoring combines latency and error rate into a live health score. Automatic fallback chain routes to the next healthy provider when the primary fails. Circuit breaker trips after 3 failures and cools for 60 seconds. Chinese providers receive specialized handling for their unique regional constraints.

- **Per-Provider Retry Logic** — Custom timeout per provider. Exponential backoff with jitter. Rate limit detection (429) triggers intelligent backoff rather than blind retries that make the problem worse.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat/completions` | OpenAI-compatible chat (streaming + non-streaming) |
| POST | `/v1/completions` | OpenAI text completions |
| POST | `/v1/route` | Routing decision without LLM call |
| GET | `/v1/models` | List available models with pricing |
| GET | `/health` | Provider health + cost summary |
| GET | `/dashboard` | Cost analytics dashboard |

Full API docs: [`docs/API.md`](docs/API.md)

---

## Package Exports

```typescript
// Main — everything
adaptive-memory-multi-model-router';

// SDK — clean high-level API
adaptive-memory-multi-model-router/sdk';

// Individual modules
adaptive-memory-multi-model-router/cache';
adaptive-memory-multi-model-router/guardrails';
adaptive-memory-multi-model-router/cost';
adaptive-memory-multi-model-router/analytics';
adaptive-memory-multi-model-router/memory';
adaptive-memory-multi-model-router/langchain';
adaptive-memory-multi-model-router/providers';
adaptive-memory-multi-model-router/server';

// Ensemble (P0) — core differentiator
adaptive-memory-multi-model-router/ensemble';

// Query-type presets (P1)
adaptive-memory-multi-model-router/presets';

// Persistent memory (P3)
adaptive-memory-multi-model-router/memory';
```

---

## When NOT to Use This

A3M Router is an **LLM gateway and router** designed for multi-provider routing. You may not need it if:

- You only use one LLM provider (no routing benefit)
- You intentionally want every query sent to the strongest model regardless of cost
- You need 250+ provider integrations (use [Portkey](https://github.com/Portkey-AI/gateway))
- You specifically need ML-based routing and are willing to train, deploy, and maintain a classifier
- You need enterprise SLAs or managed hosting

For single-provider use cases, the native SDK (OpenAI, Anthropic, etc.) is simpler.

---

## Roadmap (Coming Soon)

These features are on our roadmap based on user feedback:

| Feature | Status | Priority |
|---------|--------|----------|
| **Distributed tracing** — OpenTelemetry integration for production observability | Planned | High |
| **Webhook alerts** — Push budget alerts to Slack, PagerDuty, Teams | Planned | High |
| **Fine-grained RBAC** — Role-based access control for team budgets | Planned | Medium |
| **Multi-region failover** — Geographic load balancing across regions | Researching | Medium |
| **SLA reporting** — Uptime and latency SLAs for enterprise contracts | Researching | Low |

---

## ⭐ Supporters

If A3M Router helps you, consider:
- ⭐ Starring on [GitHub](https://github.com/Das-rebel/a3m-router)
- 📦 Sharing on [npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- 🐛 Reporting issues
- 🔀 Submitting PRs

---

## Links

- [npm package](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
- [GitHub repo](https://github.com/Das-rebel/a3m-router)
- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURAL-IMPROVEMENTS-2025.md)
- [Discussions](https://github.com/Das-rebel/a3m-router/discussions)
- [Contributing](CONTRIBUTING.md) · [Good first issues](https://github.com/Das-rebel/a3m-router/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

### Community & Support

- [🐛 Report a Bug](https://github.com/Das-rebel/a3m-router/issues/new?template=bug_report.md) — File a detailed bug report
- [✨ Request a Feature](https://github.com/Das-rebel/a3m-router/issues/new?template=feature_request.md) — Suggest an enhancement
- [📥 Pull Request Template](https://github.com/Das-rebel/a3m-router/blob/main/.github/PULL_REQUEST_TEMPLATE.md) — Use this format for all PRs
- [📋 All Issue Templates](https://github.com/Das-rebel/a3m-router/issues/new/choose) — Choose the right template for your submission

MIT License. No vendor lock-in. No account required. `npm install` and go.


---

## Research-Backed Architecture

A3M Router is built on findings from **30+ 2024-2025 arXiv papers** on LLM routing, load balancing, semantic caching, and multi-agent orchestration to deliver production-oriented features. The current validation anchor is **RouterArena PR #144: 0.9404 score, 96.77% accuracy, $0.0768/1K, 1.0000 robustness, 0 abnormal entries, 8,400 queries**.

| Paper | Year | What We Used |
|-------|------|-------------|
| **[RadixAttention (SGLang)](https://arxiv.org/abs/2412.15115)** | 2024 | **Prefix caching** — 5-10x throughput via prefix sharing across queries. Our cache module uses this pattern. |
| **[RouteLLM](https://arxiv.org/abs/2404.06035)** | 2024 | **Cost-quality routing** — learned routing baseline. We use heuristic routing instead (no GPU, faster startup). |
| **[Speculative Decoding (Medusa)](https://arxiv.org/abs/2401.10774)** | 2024 | **Multi-token prediction** — 2-3x speedup. Our speculative decoding module implements this interface. |
| **[AgentOrchestra](https://arxiv.org/abs/2506.12508)** | 2025 | **Hierarchical multi-agent orchestration** — 3-tier planning. We adapted this for provider selection. |
| **[Difficulty-Aware Routing](https://arxiv.org/abs/2509.11079)** | 2025 | **35% decision quality improvement** — difficulty-based task routing. Core of our routing engine. |
| **[MemoRAG](https://arxiv.org/abs/2512.12686)** | 2025 | **Global memory encoder** — 50% better long-context. We use MemoryTree for historical context. |
| **[A-Mem](https://arxiv.org/abs/2502.12110)** | 2025 | **Episodic memory** — 144+ citations. Our episodic memory uses EMA updates for quality scoring. |
| **[MCTS (Monte Carlo Tree Search)](https://arxiv.org/abs/2411.20000)** | 2024 | **UCB1 exploration** — multi-agent workflow optimization. Early A3M MCTS research showed `cost_quality` at 0.9370 accuracy-cost vs 0.9300 heuristic baseline. |

### Key Architecture Decisions (Research-Backed):

```
┌────────────────────────────────────────────────────────────┐
│                     Research Sources                        │
├────────────────────────────────────────────────────────────┤
│  SGLang/RadixAttention  →  Prefix caching (cache)          │
│  Medusa/Speculative     →  Multi-token prediction         │
│  AgentOrchestra/HALO     →  Hierarchical orchestration     │
│  RouteLLM/LiteLLM       →  Cost-quality routing          │
│  MemoRAG/A-Mem          →  MemoryTree (episodic+semantic)│
│  MCTS/UCB1              →  Provider selection algorithm   │
└────────────────────────────────────────────────────────────┘
```

### Why Not Use ML-Based Routing?

| Approach | RouteLLM | A3M Router |
|----------|----------|------------|
| **Training** | Requires GPU, labeled data | Zero |
| **Startup** | ~3 minutes | <100ms |
| **Updates** | Retrain required | EMA, no retraining |
| **Accuracy** | Varies | 96.77% RouterArena PR #144 |
| **Cost** | High (GPU cluster) | Zero |

RouterArena PR #144 shows A3M’s zero-training routing achieves **96.77% accuracy** and **$0.0768/1K** without ML training, outperforming known public baselines on accuracy, cost, and robustness.

---


---

