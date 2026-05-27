# 🌐 A3M Router — Cross-Platform Posting Kit (May 2026)

Use the content below to post across platforms. Each has a tailored version.

---

## 📺 dev.to

**Title:** Fastest-Growing npm LLM Router Hits 10K Downloads in 14 Days — Here's What We Did Right

**Tags:** llm, opensource, typescript, ai, devops

**URL to post:** https://dev.to/new

**Content file:** `articles/FRESH_devto_2026_05.md`

**API method (if token available):**
```bash
curl -X POST https://dev.to/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TO_API_KEY" \
  -d "$(python3 -c "
import json
with open('articles/FRESH_devto_2026_05.md') as f:
    body = f.read()
print(json.dumps({
    'article': {
        'title': 'Fastest-Growing npm LLM Router Hits 10K Downloads in 14 Days',
        'body_markdown': body,
        'tags': ['llm', 'opensource', 'typescript', 'ai', 'devops'],
        'published': true,
        'main_image': 'https://raw.githubusercontent.com/Das-rebel/a3m-router/main/docs/benchmark-chart.png'
    }
}))
")"
```

---

## 🐙 Hacker News (Show HN)

**Title:** Show HN: A3M – Open-source LLM router, 10K downloads in 14 days, parallel ensemble

**URL:** https://github.com/Das-rebel/a3m-router

**Post at:** https://news.ycombinator.com/submit

**Description (for HN comment):**
```
We built an open-source LLM router that does one thing no other router does: 
run multiple providers in parallel and merge results with confidence scoring.

Every other router (litellm, one-api, etc.) does sequential fallback — try A, fail, 
try B, fail, try C. We run all providers at once, score every result, and return 
the best answer with transparent reasoning.

Numbers: 10K downloads in 14 days, 99.5% routing accuracy, 62% cost savings, 
19.5 KB, zero ML dependencies. Independent benchmark published.

npm install adaptive-memory-multi-model-router
```

---

## 🔴 Reddit

### r/javascript
**Title:** I built an open-source LLM router that runs providers in parallel (not sequential fallback) — 10K downloads in 14 days
**URL:** https://github.com/Das-rebel/a3m-router

### r/typescript
**Title:** A3M Router — 19.5 KB TypeScript LLM router with parallel ensemble and independent benchmarks
**URL:** https://github.com/Das-rebel/a3m-router

### r/opensource
**Title:** A3M Router — fastest-growing npm LLM router, open-source, 19.5 KB, 47 providers
**URL:** https://github.com/Das-rebel/a3m-router

### r/LLMDevs
**Title:** Parallel multi-LLM execution with confidence scoring — open-source router with independent benchmarks
**URL:** https://github.com/Das-rebel/a3m-router

---

## 🐦 Twitter / X

Thread content in `articles/twitter-thread-cost-savings.md`

Post at: https://twitter.com/compose/tweet

Suggested thread:
```
1/7 We built an open-source LLM router that does one thing no competitor does.

Every router uses sequential fallback (try A → B → C).

We run ALL providers in PARALLEL, score every result, and return the best answer.

Here's why this matters ↓

2/7 The results so far:
• 10,024 downloads in 14 days (zero marketing)
• 99.5% routing accuracy
• 62% cost savings
• 19.5 KB — no GPU, no ML model

3/7 Independent benchmark (llm-gateway-bench):
Direct to Groq: 138ms
Through A3M: 374ms

236ms overhead saves $2,604/year at scale.

4/7 The feature everyone asks for: parallel ensemble.

Run NVIDIA + Groq + OpenAI at the same time. Score results. Pick the best.

No other router does this.

5/7 npm install adaptive-memory-multi-model-router
npx a3m-router serve

Point any OpenAI SDK at localhost:8787 with model: "auto"

6/7 What's included:
• 47 providers
• Parallel ensemble
• RouteLLM routing (99.5% accuracy)
• Budget enforcement
• Semantic cache (30%+ hit rate)
• Persistent memory

7/7 GitHub: github.com/Das-rebel/a3m-router
npm: adaptive-memory-multi-model-router

Built by developers, for developers. Star if you find it useful ⭐
```

---

## 📧 Email Newsletters

### TLDR Newsletter
Submit at: https://tldr.tech/submit

### Python Weekly
Submit at: https://www.pythonweekly.com/submit

### Node Weekly
Submit at: https://nodeweekly.com/submit

### JavaScript Weekly
Submit at: https://javascriptweekly.com/submit
