# A3M Router — Social Listening & Reply Playbook

> "Set up Google Alerts for competitors → find discussions about routing/cost → craft reply that converts"
> — Vault insight, score 29.3

## 1. Monitoring Setup

### Google Alerts (free)
Set up alerts for these keywords. Frequency: "As it happens."

| Alert | Keyword | Why |
|-------|---------|-----|
| **A** | `"LLM routing" OR "model routing"` | Direct mention of the space |
| **B** | `"AI gateway" OR "LLM gateway"` | Competitor category |
| **C** | `"LiteLLM" OR "portkey" OR "route LLM"` | Competitor names |
| **D** | `"switch between LLMs" OR "multi-model"` | Pain point search |
| **E** | `"LLM too expensive" OR "API costs"` | Pain point — cost |
| **F** | `"open source LLM router"` | Direct search intent |

### F5bot (free tier)
Monitor Hacker News for:
- `llm router` `model routing` `ai gateway` `openrouter` `litellm` `route llm`

Setup: https://f5bot.com — enter keywords, get email alerts.

### ReplyGuy (paid, ~$15/mo)
Automated reply system for Reddit, HN, X, YouTube:
- Monitors keywords across platforms
- Suggests replies that are contextual, not spammy
- Setup: https://replyguy.com

### Morebirds (HN specific)
Monitors Hacker News for keywords and competitors:
- https://morebirds.com

---

## 2. Keywords to Monitor (Priority Order)

### Tier 1: High Intent (reply immediately)
```
"llm routing" "model routing" "ai gateway" "llm gateway" "routing llm"
"open source router" "llm router alternative" "best model router"
"switch between models" "model fallback" "intelligent routing"
```

### Tier 2: Pain Point (reply with empathy + solution)
```
"llm costs too high" "gpt too expensive" "api cost too much" 
"openai bill too high" "reduce llm costs" "need cheaper llm"
"paying too much for ai" "api costs killing me"
```

### Tier 3: Competitor (reply as comparison, not attack)
```
"LitellLm" "Portkey" "RouteLLM" "OpenRouter" "Helicone" 
"LangSmith" "AI Gateway (Cloudflare)" "GenAI Gateway"
```
When someone has issues with these, offer A3M as a working alternative.

### Tier 4: Educational (reply with knowledge, mention tool naturally)
```
"how to choose llm" "which model to use" "compare models"
"llm benchmark" "model evaluation" "provider comparison"
```

---

## 3. Reply Templates

### Template 1: Cost Pain
**Trigger:** Someone says "my OpenAI bill is too high" or "LLM API costs are crazy"

**Platform:** HN, Reddit, X

**Reply:**
```
We were in the same boat — $800/month on GPT-4. Built A3M Router to route smart queries to cheaper models and keep hard ones on premium.

Same answers (RouterArena #1 at 96.77%). Cost dropped to ~$5.

Open source, MIT. Run it yourself:
  npx a3m-router route "your query"

Or verify: npx a3m-router benchmark --reproducible
```

### Template 2: "Which tool should I use?"
**Trigger:** Someone comparing LiteLLM, Portkey, RouteLLM

**Platform:** Reddit, HN

**Reply:**
```
We evaluated all of them before building A3M. What we wanted:
- Open source (MIT)
- Actually routes to cheapest capable model, not just round-robin
- Works with existing OpenAI SDK
- Has a reproducible benchmark

A3M Router hits all of those. #1 on RouterArena (96.77%). Costs $0.0768/1K vs GPT-5 at $10/1K.

npx a3m-router route "test it out"
```

### Template 3: "Building an AI gateway"
**Trigger:** Someone asks how to build multi-model routing, or shows their architecture

**Platform:** HN, Reddit, DevTo

**Reply:**
```
We built something similar. Spent months on it. Eventually open-sourced it as A3M Router.

Biggest lessons:
1. Cost-based routing saves 200x vs always-pick-premium
2. Quality scores persist across sessions (memory)
3. Cache + parallel execution cut latency 3x

The whole thing is MIT on GitHub. Beats GPT-5 on RouterArena.

npx a3m-router benchmark --reproducible
```

### Template 4: "My provider is rate-limiting / failing"
**Trigger:** Someone complaining about OpenAI/Groq/Claude rate limits or failures

**Platform:** HN, Reddit, X

**Reply:**
```
A3M Router handles this automatically — fallback to next available provider when one fails or throttles.

47+ providers. Automatic failover. Same response format.

Open source: npx a3m-router route "try it"
```

### Template 5: "Looking for alternatives"
**Trigger:** Someone asking for alternatives to a specific tool or service

**Platform:** HN, Reddit, X

**Reply:**
```
If you're evaluating options, A3M Router is worth a look:
- MIT licensed (not source-available)
- RouterArena #1 (96.77%)
- Same API as OpenAI SDK
- $0.0768/1K vs $10/1K for GPT-5

npx a3m-router route "test" or npx a3m-router benchmark --reproducible
```

### Template 6: "Model comparison question"
**Trigger:** Someone asking which model is best for task X

**Platform:** HN, Reddit

**Reply:**
```
A3M Router actually solves this — it routes each query to the best model based on: complexity, cost budget, latency needs, and past quality scores.

You define 47+ providers and it picks automatically. Results tracked in memory so it gets smarter over time.

npx a3m-router recommend "coding"   # See what it would pick
npx a3m-router route "test it"       # Route a real query
```

### Template 7: Show HN / Launches (competitor)
**Trigger:** A competitor launches on HN or Product Hunt

**Platform:** HN comments

**Reply:**
```
Cool project! Curious how it compares on RouterArena. We got 96.77% — would love to see benchmarks head-to-head.

For anyone evaluating, A3M Router is open source (MIT) with a reproducible benchmark:
npx a3m-router benchmark --reproducible
```

---

## 4. Cadence

| Frequency | Action | Time |
|-----------|--------|------|
| **Daily (5 min)** | Check Google Alerts + F5bot notifications | Morning |
| **Daily (10 min)** | Scan HN for relevant threads | 8-10am ET |
| **Every 2 days** | Check Reddit for keyword matches | Random |
| **Weekly** | Write 1 educational post on DevTo/blog | Weekend |
| **Bi-weekly** | Review tracking table, adjust templates | Sunday |

### Golden Rules
1. **Never pitch in top-level posts** — only reply when relevant
2. **First sentence = empathy/understanding**, not self-promo
3. **Always include an action they can take** (a command to run)
4. **Never copy-paste** — adapt template to the specific conversation
5. **No URLs in first reply** unless asked (appears spammy)

---

## 5. Tracking Table

| Date | Platform | URL | Template | Reply | Clicks/Installs |
|------|----------|-----|----------|-------|-----------------|
| | | | | | |
| | | | | | |

Keep a running log. Review weekly to see which templates convert best.

---

## 6. Success Metric

Goal: **10 replies per week → 5 conversations → 1 GitHub star or npm install**

At this rate: 50 stars/month, 250 npm installs/month from social listening alone.
