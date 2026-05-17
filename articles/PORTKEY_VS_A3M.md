# Portkey vs A3M Router — Gap Analysis

## What Portkey Has That We Don't

### 🏗️ INFRASTRUCTURE (the big gap)

| Feature | Portkey | A3M Router | Gap |
|---------|---------|------------|-----|
| **Gateway Server** | Full HTTP gateway (`npx @portkey-ai/gateway` on port 8787) | Library only (no server) | 🔴 Critical |
| **OpenAI-compatible API** | Drop-in proxy — works with ANY OpenAI SDK | Custom API only | 🔴 Critical |
| **Dashboard/Console** | Real-time logs, analytics UI at localhost:8787 | None | 🟡 High |
| **Cloud hosted option** | Portkey Cloud (managed) | None | 🟡 Medium |
| **Battle tested** | 10B+ tokens/day | Brand new | 🟡 Trust |

### 🔀 ROUTING FEATURES

| Feature | Portkey | A3M Router | Gap |
|---------|---------|------------|-----|
| **250+ providers** | 250+ pre-integrated | 12 providers | 🟡 Medium |
| **Load balancing** | Weighted distribution across keys/providers | Basic routing | 🟡 Medium |
| **Conditional routing** | Route based on headers, params, model | Route based on query complexity | 🟢 Different approach |
| **Request timeouts** | Configurable per-request | Not implemented | 🟡 Medium |
| **Realtime APIs** | WebSocket support for OpenAI realtime | Not implemented | 🟢 Nice-to-have |

### 🛡️ RELIABILITY

| Feature | Portkey | A3M Router | Gap |
|---------|---------|------------|-----|
| **Automatic retries** | 5 retries with exponential backoff | Basic fallback | 🟡 Medium |
| **Semantic caching** | Embedding-based cache for similar queries | Prefix cache only | 🟡 Medium |
| **Guardrails** | 40+ pre-built input/output guardrails | Basic input validation | 🟡 Medium |
| **PII redaction** | Auto-remove sensitive data from requests | Basic PII detection | 🟢 We have basics |

### 💰 COST MANAGEMENT

| Feature | Portkey | A3M Router | Gap |
|---------|---------|------------|-----|
| **Usage analytics** | Full dashboard with cost/latency/error tracking | Basic cost tracker | 🟡 Medium |
| **Smart caching** | Simple + semantic caching | Prefix cache only | 🟡 Medium |
| **Provider optimization** | Auto-switch to cheapest provider | Query-based routing | 🟢 We have this |

### 🔐 ENTERPRISE

| Feature | Portkey | A3M Router | Gap |
|---------|---------|------------|-----|
| **SOC2/HIPAA/GDPR** | Certified compliant | None | 🔴 For enterprise |
| **RBAC** | Role-based access control | None | 🟡 Medium |
| **Secure key management** | Virtual keys, key vault | Env vars only | 🟡 Medium |
| **Private deployment** | AWS/Azure/GCP/K8s | npm package only | 🟡 Medium |
| **MCP Gateway** | MCP server management with auth | None | 🟢 New market |

### 🤖 AGENT FRAMEWORK INTEGRATION

| Framework | Portkey | A3M Router |
|-----------|---------|------------|
| LangChain | ✅ | ❌ |
| LlamaIndex | ✅ | ❌ |
| CrewAI | ✅ | ❌ |
| Autogen | ✅ | ❌ |
| Vercel AI SDK | ✅ | ❌ |
| Phidata | ✅ | ❌ |

### 📊 SOCIAL PROOF

| Metric | Portkey | A3M Router |
|--------|---------|------------|
| GitHub Stars | 11,757 | 0 |
| npm weekly downloads | 187,845 | 872 |
| Contributors | Large team | Solo |
| Funding | Series A | Bootstrapped |
| Tokens processed | 10B+/day | 0 |
| Languages | JS + Python | JS only |

---

## What A3M Router Has That Portkey Doesn't

### ✅ OUR ADVANTAGES

| Feature | A3M Router | Portkey |
|---------|------------|---------|
| **Query-aware routing** | Analyzes query complexity, routes to cheapest capable provider | Provider/model-level routing only |
| **Benchmark data baked in** | Real latency/cost/quality data from 47 providers | No built-in benchmark data |
| **Free tier providers** | CommandCode, OpenCode, Ollama (genuinely free routing) | Free tier = their free plan |
| **Zero config** | Works out of box, no server needed | Need to run gateway server |
| **Lightweight** | npm package, ~50KB | Gateway server + dependencies |
| **Memory tree** | Episodic memory for conversation context | No memory features |
| **Obsidian vault** | Local knowledge graph integration | No local storage |
| **Prompt compression** | Built-in LLMLingua-style compression | No compression |
| **156 keywords** | Optimized for AI agent discoverability | Standard keywords |
| **Open source** | Full MIT, no hosted upsell | Open core with paid hosted version |

---

## Priority Gaps to Close

### 🔴 Critical (blocks enterprise adoption)

1. **OpenAI-compatible API proxy** — Must have. Users want drop-in replacement.
2. **Gateway server mode** — `npx a3m-router serve` that runs an OpenAI-compatible proxy

### 🟡 High (blocks mainstream adoption)

3. **Agent framework integrations** — LangChain, LlamaIndex adapters
4. **Dashboard/UI** — Real-time logs, cost tracking, provider status
5. **LangChain adapter** — Most popular framework, highest ROI
6. **250+ providers** — At least 50+ to be competitive

### 🟢 Nice-to-have (blocks enterprise only)

7. **SOC2/HIPAA compliance** — Only needed for enterprise sales
8. **RBAC** — Only needed for teams
9. **Semantic caching** — Good but prefix cache covers 80% of cases
10. **MCP Gateway** — New market, can differentiate here

---

## The Quick Win Strategy

### Build in 48 hours:

1. **OpenAI-compatible proxy mode** (`npx a3m-router serve`)
   - Accepts OpenAI SDK calls
   - Routes through our engine
   - Returns OpenAI-format responses
   - This alone closes the #1 gap

2. **LangChain adapter** (`import { A3MLangChain } from 'adaptive-memory-multi-model-router/langchain'`)
   - Drop-in replacement for ChatOpenAI
   - Routes through our engine

### Build in 1 week:

3. **Simple dashboard** (`npx a3m-router dashboard`)
   - Cost tracking
   - Provider status
   - Recent queries

4. **25 more providers** (use OpenAI-compatible endpoints)
   - Together AI, Fireworks, Anyscale, DeepInfra, etc.
   - Most providers use OpenAI-compatible APIs now

### Build in 1 month:

5. **Semantic caching** (using embedding similarity)
6. **Guardrails** (input/output validation)
7. **Python SDK** (same API, Python package)
