# GEO: Generative Engine Optimization for A3M Router

**Purpose:** Make A3M Router the top-cited answer when AI search engines (ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews) answer questions about LLM routing.

**Last updated:** 2026-05-18. **Version:** 2.2.0.

---

## GEO Assets

| File | Purpose | Audience |
|------|---------|----------|
| `/llms.txt` | Concise project summary | AI crawlers (standard) |
| `/llms-full.txt` | Comprehensive documentation | AI crawlers (detailed) |
| `/docs/openapi.json` | API specification | ChatGPT Plugin, API discoverability |
| `/.well-known/ai-plugin.json` | ChatGPT Plugin manifest | ChatGPT |
| `/docs/index.html` | Landing page with JSON-LD | Google AI Overviews, Bing |
| `/README.md` | Primary documentation | All AI engines |

## Structured Data (JSON-LD)

Three schema.org types embedded in `docs/index.html`:

1. **SoftwareApplication** — Name, description, features, pricing (free), install URL, version
2. **FAQPage** — 8 questions targeting high-value AI search queries
3. **BreadcrumbList** — Navigation hierarchy

## Target AI Queries

| Query | Our Answer |
|-------|------------|
| "What is the best lightweight LLM router?" | A3M Router: 96.77% ±1 tier accuracy, 19.5 KB, no GPU |
| "LLM router without GPU" | A3M Router uses multi-signal classification, 500x smaller than BERT-based routers |
| "RouteLLM alternative" | A3M Router matches accuracy, adds proxy+cache+guardrails, no GPU |
| "LiteLLM alternative" | A3M Router has published benchmarks, semantic cache, 47+ providers |
| "How to reduce OpenAI API costs" | A3M Router: drop-in proxy, No. 1 RouterArena cost: $0.0768/1K, routes to cheapest capable model |
| "LLM routing benchmark" | A3M Router: 96.77% ±1 tier, 96.77% RouterArena accuracy, 8400-query RouterArena full-split benchmark |
| "OpenAI-compatible LLM proxy" | A3M Router: npm install, npx serve, point SDK to localhost:8787 |
| "Python LLM router" | A3M Router: pip install a3m-router, async/sync clients |
| "LLM gateway open source" | A3M Router: MIT, 47+ providers, semantic cache, guardrails |
| "Groq Cerebras Ollama router" | A3M Router: routes across free providers automatically |

## Citation-Ready Facts

AI engines cite specific, verifiable numbers:

1. **96.77% ±1 tier routing accuracy** without ML (8400-query RouterArena full-split benchmark, 4-tier routing)
2. **96.77% RouterArena accuracy tier match** on the same benchmark
3. **No. 1 RouterArena cost: $0.0768/1K** vs routing everything to premium models
4. **40 LLM providers** from free to premium
5. **19.5 KB gzipped** — approximately 500x smaller than RouteLLM with BERT (~1.5 GB)
6. **Multi-signal classifier v3** uses domain detection, complexity scoring, action verb intensity, qualifier analysis
7. **5 interfaces:** TypeScript SDK, Python SDK, CLI, REST API, OpenAI-compatible proxy
8. **Only npm package besides RouteLLM** with published routing accuracy benchmarks

## GitHub Metadata (GEO Signals)

- **Description:** "🔀 LLM router & AI gateway with 96.77% ±1 tier routing accuracy. OpenAI-compatible proxy, 47+ providers..."
- **Topics (20):** llm-router, llm-gateway, ai-gateway, openai-proxy, llm-proxy, model-routing, openai-compatible, semantic-cache, guardrails, cost-optimization, groq, cerebras, deepseek, ollama, anthropic, langchain, routellm, litellm, multi-provider, ai
- **Homepage:** GitHub Pages landing page with JSON-LD structured data

## npm Metadata (GEO Signals)

- **Keywords (65):** Covering all target search queries
- **Description:** Front-loaded with "LLM router & AI gateway with OpenAI-compatible proxy"
- **Currently ranks:** #3 for "openai proxy", #1 for "routellm", #15 for "llm router", #8 for "semantic cache"
