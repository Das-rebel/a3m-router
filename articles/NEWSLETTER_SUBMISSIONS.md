# Newsletter Submissions

## 6 Target Newsletters

### 1. Import AI (jack@sequoiacap.com)
**Audience:** AI researchers, builders
**Frequency:** Weekly
**Submission:** Email to jack@sequoiacap.com

### 2. The Batch (Anthropic)
**URL:** https://www.anthropic.com/news (press@anthropic.com)

### 3. OpenAI Newsletter
**URL:** https://openai.com/newsletter

### 4. DeepLearning.ai Newsletter
**URL:** https://www.deeplearning.ai/newsletter/

### 5. Lil'Log (Lilian Weng)
**URL:** https://lilianweng.github.io/ (lilian@openai.com)

### 6. The Economist AI
**URL:** https://www.economist.com/newsletters/ai

---

## Email Template for Import AI

```
Subject: A3M Router — #1 LLM routing benchmark, 213× cheaper than GPT-5

Hi Jack,

I wanted to share A3M Router, an open-source project that might interest your readers.

**The Pitch:**
Most teams send every AI query to GPT-4o, paying $10-60 per 1K tokens. A3M Router
intelligently routes queries to the cheapest capable model, achieving:

- **#1 on RouterArena** (76.43 score, arXiv:2510.00202) — beating 18 other routers
- **$0.047/1K queries** — 213× cheaper than GPT-5
- **<1ms routing** — no GPU required, rule-based heuristics
- **47+ providers** — Groq, DeepSeek, Mistral, Claude Haiku, etc.

**How it works:**
A3M analyzes 12 keyword signals across 5 dimensions (domain, complexity, intent,
length, structure) to instantly route queries to the optimal provider.

For example:
- "Hi" → Groq (free tier)
- "Debug my Python code" → DeepSeek ($0.0003/query)
- "Explain quantum entanglement" → GPT-4o mini ($0.0015/query)

**Benchmark results:**
| Router | Score | Cost/1K |
|--------|-------|----------|
| A3M Router | 76.43 | $0.047 |
| Sqwish | 75.27 | $0.18 |
| GPT-5 | 64.32 | $10.02 |

**Demo:** https://asciinema.org/a/RpqOZM9tFMALYWvs
**GitHub:** https://github.com/Das-rebel/a3m-router
**npm:** https://www.npmjs.com/package/adaptive-memory-multi-model-router

Happy to chat more or provide a more detailed technical breakdown.

Best,
Subho Das
Das-rebel
```

---

## Generic Newsletter Pitch

```
Subject: [Tool] A3M Router — Open-source LLM routing, #1 on RouterArena

Hi,

I built A3M Router, an open-source LLM gateway that automatically routes queries
to the cheapest capable model.

**Quick facts:**
- Ranks #1 on RouterArena (76.43 score, beating GPT-5 at 64.32)
- Costs $0.047/1K queries (vs GPT-5's $10.02)
- Routes in <1ms with no ML training required
- Supports 47+ providers with automatic failover

**One-liner:** Think of it as "CI/CD for AI spend" — automatically route
every query to the right model at the right price.

**Demo:** https://asciinema.org/a/RpqOZM9tFMALYWvs
**GitHub:** https://github.com/Das-rebel/a3m-router

Would love to be included in your next issue if it's a good fit.

Thanks!
```

---

## Submission Checklist

- [ ] Import AI: Email jack@sequoiacap.com
- [ ] The Batch: Submit at anthropic.com/news
- [ ] OpenAI Newsletter: Subscribe + check submission page
- [ ] DeepLearning.ai: Submit at deeplearning.ai/newsletter
- [ ] Lil'Log: Email or Twitter DM @lilianweng
- [ ] The Economist: Submit via website form

**Tip:** Submit to Import AI first — most likely to cover indie projects.
