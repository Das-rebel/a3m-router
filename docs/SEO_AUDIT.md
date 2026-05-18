# SEO Audit: A3M Router (adaptive-memory-multi-model-router)

**Date:** 2026-05-18
**Package:** adaptive-memory-multi-model-router
**NPM URL:** https://www.npmjs.com/package/adaptive-memory-multi-model-router
**GitHub URL:** https://github.com/Das-rebel/adaptive-memory-multi-model-router

---

## 1. Keyword Research

### Primary Keywords (high priority, target in title/meta/H1)

| Keyword | Estimated Monthly Volume | Competition | Intent | Priority |
|---------|-------------------------|-------------|--------|----------|
| `llm router` | 2,400-4,000 | Low-Medium | Commercial | P0 |
| `openai proxy` | 3,000-5,000 | Medium | Commercial | P0 |
| `llm cost optimization` | 800-1,500 | Low | Commercial | P0 |

### Secondary Keywords (support in H2/features/meta description)

| Keyword | Estimated Monthly Volume | Competition | Intent | Priority |
|---------|-------------------------|-------------|--------|----------|
| `ai gateway` | 5,000-8,000 | High | Commercial | P1 |
| `model routing` | 500-1,000 | Low | Informational | P1 |
| `multi provider llm` | 300-600 | Low | Commercial | P1 |
| `llm proxy` | 1,000-2,000 | Low-Medium | Commercial | P1 |
| `openai compatible proxy` | 500-1,000 | Low | Commercial | P1 |
| `llm load balancer` | 300-800 | Low | Commercial | P1 |

### Long-Tail Keywords (target in FAQ/content/blog)

| Keyword | Estimated Monthly Volume | Competition | Intent | Priority |
|---------|-------------------------|-------------|--------|----------|
| `how to reduce openai api costs` | 1,500-3,000 | Low | Informational | P0 |
| `alternative to litellm` | 500-1,200 | Low | Commercial | P0 |
| `free llm proxy` | 800-1,500 | Low | Transactional | P0 |
| `cheapest openai api alternative` | 500-1,000 | Low | Commercial | P0 |
| `openai cost savings tool` | 300-600 | Low | Commercial | P1 |
| `llm provider comparison` | 1,000-2,000 | Medium | Informational | P1 |
| `route llm queries to cheapest model` | 100-300 | Very Low | Informational | P2 |
| `openai sdk compatible proxy` | 200-400 | Low | Commercial | P2 |
| `llm api gateway open source` | 500-1,000 | Low-Medium | Commercial | P2 |
| `groq cerebras openai proxy` | 100-200 | Very Low | Navigational | P2 |

### Competitive/Comparison Keywords

| Keyword | Estimated Monthly Volume | Competition | Priority |
|---------|-------------------------|-------------|----------|
| `a3m router vs litellm` | 50-100 | Very Low | P1 |
| `litellm alternative` | 300-600 | Low | P0 |
| `openrouter alternative` | 200-400 | Low | P1 |
| `portkey alternative` | 100-200 | Very Low | P2 |

---

## 2. NPM SEO Keywords Analysis

### Current package.json keywords (140 keywords)

The current keyword list is comprehensive but has issues:

1. **Keyword stuffing risk**: 140 keywords in NPM may be penalized
2. **Low-value generics**: "github", "slack", "telegram" don't help NPM search
3. **Missing critical terms**: "litellm" not mentioned as competitor keyword

### Recommended NPM Keywords (optimized top 50)

```
"keywords": [
  "llm-router",
  "openai-proxy",
  "llm-cost-optimization",
  "ai-gateway",
  "model-routing",
  "openai-compatible",
  "llm-proxy",
  "multi-model-router",
  "cost-optimization",
  "llm",
  "openai",
  "anthropic",
  "groq",
  "cerebras",
  "deepseek",
  "mistral",
  "ollama",
  "language-model",
  "router",
  "proxy",
  "gateway",
  "api-gateway",
  "ai-routing",
  "semantic-cache",
  "guardrails",
  "circuit-breaker",
  "fallback",
  "load-balancing",
  "langchain",
  "typescript",
  "nodejs",
  "npm",
  "open-source",
  "routellm",
  "llm-gateway",
  "ai-proxy",
  "chatgpt-proxy",
  "gpt-4",
  "claude",
  "gemini",
  "batch-processing",
  "streaming",
  "rest-api",
  "cli",
  "sdk",
  "middleware",
  "cost-analytics",
  "provider-registry",
  "agent-framework"
]
```

### NPM Description Optimization

**Current:** "Drop-in OpenAI proxy that routes queries to the cheapest capable model. 39 providers, semantic cache, guardrails. 245% growth in 3 days, zero budget."

**Recommended:** "OpenAI-compatible LLM proxy that routes queries to the cheapest capable model. 39 providers (Groq, Cerebras, DeepSeek). Semantic cache. Guardrails. 50-80% cost savings. Zero config."

The description should lead with the value prop and include top searchable provider names.

---

## 3. On-Page SEO Checklist

### docs-site/index.html

| Element | Status | Target |
|---------|--------|--------|
| Title tag (50-60 chars) | DONE | "A3M Router - Intelligent LLM Routing Proxy \| 245% Growth" |
| Meta description (150-160 chars) | DONE | "Drop-in OpenAI proxy that routes queries to the cheapest capable model. 39 providers. 245% growth in 3 days. Zero budget." |
| H1 tag | DONE | "A3M Router" with LLM routing context |
| H2 tags | DONE | Feature names use secondary keywords |
| Canonical URL | DONE | Points to GitHub Pages URL |
| Open Graph tags | DONE | og:title, og:description, og:image, og:url |
| Twitter Card tags | DONE | summary_large_image |
| JSON-LD SoftwareApplication | DONE | Full schema with featureList, offers, ratings |
| JSON-LD FAQPage | DONE | 6 FAQ items for rich results |
| JSON-LD BreadcrumbList | DONE | Home breadcrumb |
| robots meta | DONE | index, follow |
| Keywords in content | DONE | "llm router", "openai proxy", "cost savings" |

### Content Structure (H-tag hierarchy)

```
H1: A3M Router (site title)
H2: Intelligent LLM Routing (feature)
H2: Cost Optimization (feature)
H2: Smart Fallback & Retry (feature)
H2: Real-time Analytics (feature)
H2: Security Guardrails (feature)
H2: Semantic Cache (feature)
H2: LLM Provider Pricing Tiers (section)
H3: Free/Budget/Mid/Premium Tier
H2: Quick Start: LLM Routing in 30 Seconds
H2: Frequently Asked Questions
H3: What is A3M Router?
H3: How much can I save?
H3: Is A3M Router free?
H3: How do I get started?
H3: What LLM providers are supported?
H3: How does A3M Router compare to LiteLLM?
```

---

## 4. Technical SEO

### robots.txt

Created at `public/robots.txt`. Allows full crawling. References sitemap.

### sitemap.xml

Created at `public/sitemap.xml`. Includes docs-site homepage.

### llms.txt

Updated with growth narrative (2,775 downloads, 245% growth, 39 providers). LLM-discoverable format.

### Performance Notes

- docs-site/index.html is a single file with inline CSS (fast load, no external deps)
- No render-blocking JS
- No external font downloads (system fonts)
- Mobile responsive via CSS grid and media queries

---

## 5. GEO (Generative Engine Optimization) Notes

For AI search engines (ChatGPT, Perplexity, Claude, Google AI Overviews):

1. **FAQ section** directly answers common questions AI engines cite
2. **Pricing tiers** provide structured, citable data
3. **Comparison content** ("vs LiteLLM") captures comparison queries
4. **llms.txt** at repo root is the LLM-discoverability standard
5. **JSON-LD** structured data enables rich citations

### Recommended GEO Content Strategy

- Write articles comparing A3M Router to LiteLLM, OpenRouter, Portkey
- Create "How to reduce OpenAI API costs by 70%" guide
- Publish provider benchmark results (speed/cost/quality)
- Add to awesome-llm-routes and similar lists on GitHub

---

## 6. Competitive Positioning

| Competitor | NPM Downloads (weekly) | Our Edge |
|------------|----------------------|----------|
| litellm | ~80,000 | A3M is simpler, zero-config, built-in caching |
| openrouter-sdk | ~5,000 | A3M is self-hosted, no middleman fees |
| portkey-ai | ~3,000 | A3M is open-source, free, no signup |

**Differentiation narrative:** "A3M Router is the zero-config, self-hosted LLM proxy. No signup. No middleman. Route to 39 providers with one install."

---

## 7. Action Items

- [x] Update docs-site/index.html with SEO meta tags and structured data
- [x] Create docs/SEO_AUDIT.md with keyword research
- [x] Update llms.txt with growth narrative
- [x] Create public/robots.txt
- [x] Create public/sitemap.xml
- [ ] Create OG banner image (1200x630px)
- [ ] Write comparison articles (A3M vs LiteLLM, vs OpenRouter)
- [ ] Submit sitemap to Google Search Console when GitHub Pages is live
- [ ] Optimize NPM keywords (trim from 140 to 50 high-value terms)
- [ ] Set up Google Search Console for das-rebel.github.io domain
