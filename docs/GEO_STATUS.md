# A3M Router — GEO (Generative Engine Optimization) Status

**Generated:** Sat May 31 18:30 IST 2026

---

## What is GEO?

GEO = Getting your brand/product cited by AI engines (ChatGPT, Perplexity, Claude, Gemini, Google AI Overviews).

Unlike SEO (Google ranking), GEO is about being the **source cited in AI answers**.

---

## Current GEO Assets Status

### ✅ WORKING - AI Can Discover These

| Asset | URL | Purpose | Status |
|-------|-----|---------|--------|
| **llms.txt** | https://das-rebel.github.io/a3m-router/llms.txt | AI-readable summary (19KB) | ✅ Working |
| **sitemap.xml** | https://das-rebel.github.io/a3m-router/sitemap.xml | AI crawler guidance | ✅ Working |
| **robots.txt** | https://das-rebel.github.io/a3m-router/robots.txt | AI bot permissions | ✅ Working |
| **benchmark-chart.png** | https://das-rebel.github.io/a3m-router/benchmark-chart.png | Visual proof for citations | ✅ Working |
| **openapi.json** | https://das-rebel.github.io/a3m-router/docs/openapi.json | API spec for ChatGPT plugins | ✅ Working |

### ❌ BROKEN - Need Fixes

| Asset | URL | Problem |
|-------|-----|---------|
| **ai-plugin.json** | https://das-rebel.github.io/a3m-router/.well-known/ai-plugin.json | GitHub Pages doesn't serve hidden directories |
| **llms-full.txt** | https://das-rebel.github.io/a3m-router/llms-full.txt | 404 - not deployed |
| **JSON-LD** | https://das-rebel.github.io/a3m-router/docs/index.html | May not be valid |

---

## AI Bot Access (robots.txt)

✅ **All AI bots allowed:**
```
User-agent: GPTBot         (OpenAI)
User-agent: ChatGPT-User   (ChatGPT)
User-agent: ClaudeBot      (Anthropic)
User-agent: PerplexityBot  (Perplexity)
User-agent: Google-Extended (Google AI)
User-agent: anthropic-ai   (Anthropic)
User-agent: Cohere-AI     (Cohere)
User-agent: CCBot         (Common Crawl)
```

---

## What's Missing (Action Items)

### 1. Fix ai-plugin.json
**Problem:** GitHub Pages doesn't serve `.well-known/` directory.

**Solution:** Create `docs/.well-known/` and copy files there.

**Files to create:**
- `docs/.well-known/ai-plugin.json` → URL: `/docs/.well-known/ai-plugin.json`
- Update the URL reference in ai-plugin.json to point to `/docs/openapi.json`

### 2. Deploy llms-full.txt
**Problem:** Only `llms.txt` (2KB) is deployed, not `llms-full.txt` (9KB).

**Solution:** Copy `llms-full.txt` to `docs/llms-full.txt`

### 3. Verify JSON-LD
**Problem:** Need to verify the JSON-LD in index.html is valid and complete.

**Solution:** Run JSON-LD validator on the page.

---

## How AI Engines Discover A3M Router

### Discovery Path 1: Direct Crawl
- Bot visits `das-rebel.github.io/a3m-router/`
- Reads `llms.txt` (AI-optimized summary)
- Reads `robots.txt` (permissions)
- Indexes content

### Discovery Path 2: npm Registry
- Bot crawls `npmjs.com/package/adaptive-memory-multi-model-router`
- Reads description, keywords (65 keywords!)
- Finds GitHub link

### Discovery Path 3: GitHub Topics
- Bot reads repo metadata
- Sees topics: `llm-router, ai-gateway, openai-proxy, benchmark, ...`
- 20 topics for discoverability

### Discovery Path 4: ChatGPT Plugin
- User searches for "LLM router" in ChatGPT
- If ai-plugin.json deployed, shows as plugin
- Currently broken ❌

---

## GEO Optimization Recommendations

### High Priority (Fix Now)

1. **Fix ai-plugin.json deployment**
   ```bash
   mkdir -p docs/.well-known
   cp .well-known/ai-plugin.json docs/.well-known/
   ```

2. **Deploy llms-full.txt** (comprehensive docs for AI)
   ```bash
   cp llms-full.txt docs/llms-full.txt
   ```

3. **Add structured data to README.md**
   - GitHub reads README for AI summaries
   - Ensure benchmark numbers are prominent

### Medium Priority (Next Week)

4. **Verify JSON-LD in index.html**
   - Test at: https://validator.schema.org/
   - Ensure FAQPage schema is valid

5. **Add citation-friendly content**
   - Create "CITATIONS.md" with fact sheets
   - Include verbatim numbers AI can cite

6. **Register with AI directories**
   - ChatGPT Plugin directory
   - Anthropic model registry
   - Perplexity publisher program

### Low Priority (Later)

7. **Create dedicated landing page for AI engines**
   - Minimal, citation-friendly content
   - No JavaScript, pure HTML

8. **Add Schema.org FAQPage**
   - Target "What is the best LLM router?" queries
   - 8-10 Q&As with citation-ready answers

---

## How to Test GEO

### Test 1: Ask ChatGPT
> "What's the best open-source LLM router?"

Does A3M Router appear? If not, why?

### Test 2: Ask Perplexity
> "Compare LLM routing tools"

Does A3M Router appear with correct benchmark numbers?

### Test 3: Check Claude Citation
> "What LLM router saves the most money?"

Does Claude cite A3M Router with "$0.047/1K"?

---

## Current npm Keywords (GEO Signals)

65 keywords targeting AI search:
```
llm-router, llm-gateway, ai-gateway, openai-proxy, llm-proxy,
model-routing, openai-compatible, semantic-cache, guardrails,
cost-optimization, groq, cerebras, deepseek, ollama, anthropic,
langchain, routellm, litellm, multi-provider, ai, artificial-intelligence,
api-gateway, budget-control, circuit-breaker, free-llm, llm-cost,
parallel-execution, provider-routing, llm-routing, ...
```

---

## Next Steps

1. **Fix ai-plugin.json** → Copy to docs/.well-known/
2. **Deploy llms-full.txt** → Copy to docs/
3. **Test with AI** → Ask ChatGPT/Claude about LLM routers
4. **Monitor** → Track if A3M appears in AI answers

---

## Vault Insights on GEO

From vault learnings:

> "SEO is slowly losing its dominance. Welcome to GEO.
> In the age of ChatGPT, Perplexity, and Claude, Generative Engine Optimization is positioned to become the new playbook for brand visibility.
> It's not about gaming the algorithm — it's about being cited by it."

> "Now people ask AI, not Google and if you're not in the answer, you don't exist."

> "Add this 1 small file to your website to get your brand in any LLM" → ai-plugin.json