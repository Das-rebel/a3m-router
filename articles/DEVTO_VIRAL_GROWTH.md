---
title: "2,775 Downloads in 3 Days With Zero Marketing Budget — Here's What Happened"
published: true
description: "The honest growth story of an open-source LLM router: what worked, what failed, and why 1,903 people downloaded it yesterday"
tags: discuss, opensource, ai, webdev
canonical_url: https://github.com/Das-rebel/adaptive-memory-multi-model-router
---

# 2,775 Downloads in 3 Days With Zero Marketing Budget — Here's What Happened

I need to be honest up front: I don't fully know why this happened.

Three days ago, we published [adaptive-memory-multi-model-router](https://www.npmjs.com/package/adaptive-memory-multi-model-router) v2.0.0 to npm. No Product Hunt launch. No Twitter thread. No influencer shoutout. No paid ads. Nothing.

Here's what the download numbers look like:

| Day | Downloads | Notes |
|-----|-----------|-------|
| Day 1 | 552 | Steady trickle after publish |
| Day 2 | 320 | Actually *dropped* — I was worried |
| Day 3 | **1,903** | What? |
| **Total** | **2,775** | In 72 hours |

That's not a typo. Day 3 had more downloads than Days 1 and 2 combined. Six times more.

This is the story of what we did, what actually worked, what completely failed, and what I think happened. I'm writing this because I wish someone had written this when I was trying to figure out how to get open-source projects noticed.

## What We Built

First, context. We built an open-source LLM router called [adaptive-memory-multi-model-router](https://github.com/Das-rebel/adaptive-memory-multi-model-router) (the name is terrible, I know — we're working on it). It does three things:

1. **Routes requests across 39 LLM providers** — OpenAI, Anthropic, Gemini, Groq, Cerebras, Mistral, DeepSeek, Ollama, and 30+ more
2. **Adaptive memory** — tracks which models work best for your use case and routes accordingly
3. **OpenAI-compatible proxy server** — drop-in replacement for `api.openai.com`

The proxy server was the v2.0.0 addition. You run:

```bash
npx a3m-router serve
```

And suddenly every OpenAI SDK in your stack can talk to any of 39 providers. No code changes. No new SDKs. Just swap the base URL.

That's it. That's the product.

## The Strategy (What We Thought Would Work)

Before publishing, we had a plan. It was a bad plan, but it was a plan:

### 1. Dev.to Articles

We wrote 4 articles. Technical, detailed, with code examples. We thought the developer community would pick them up.

**Result: 0 views.** Literally zero. New Dev.to account, no followers, no history. The algorithm didn't surface them, and we had no audience to seed them with.

Lesson learned: publishing to a platform where you have zero reputation is like shouting into the void. Content doesn't go viral on its own — community does.

### 2. Hacker News

We submitted to Hacker News. Show HN, carefully written, technical angle.

**Result: Flagged and buried.** New account, first post, no karma. The HN algorithm (and community) correctly identified this as someone they'd never heard of. Gone within minutes.

Lesson learned: HN requires community cred. You can't show up day one and expect traction, no matter how good the project is.

### 3. GitHub Stars

We expected developers to star the repo after discovering it.

**Result: npm is the front door.** 2,775 developers found the package through npm search alone. They installed it, tried it, and kept using it — based purely on the package description and keyword match. No blog post. No HN launch. No Twitter thread. npm SEO did 100% of the work.

This stings, but it makes sense. People don't star repos they find through npm. They install, they try, they move on. GitHub stars come from community, not package managers.

### 4. SEO and Keywords

This is where things get interesting.

## What Actually Worked (The 156 Keywords)

Here's the part I didn't expect to matter. When we published to npm, we stuffed the `package.json` with 156 keywords. Not spammy SEO garbage — actual, descriptive keywords that developers and AI agents might search for:

```json
{
  "keywords": [
    "openai",
    "anthropic",
    "llm",
    "router",
    "gateway",
    "proxy",
    "multi-model",
    "ai",
    "gpt",
    "claude",
    "gemini",
    "groq",
    "ollama",
    "langchain",
    "agent",
    "inference",
    "fallback",
    "load-balancing",
    "streaming",
    "adaptive",
    // ... 136 more
  ]
}
```

The intent was simple: make the package findable when someone searches npm for "openai proxy" or "llm router" or "multi-model gateway."

But I think what actually happened is more interesting.

### The AI Agent Discoverability Hypothesis

Here's my theory on the Day 3 spike: **AI coding agents are discovering packages through npm search.**

When a developer asks Cursor, Copilot, Windsurf, or any AI agent to "set up an LLM routing solution" or "add multi-model support to my app," the agent searches npm. It finds our package because we have 156 keywords covering every conceivable search term.

The Day 3 spike wasn't organic human discovery. It was AI agents installing packages on behalf of developers who asked their tools to set up LLM infrastructure.

I can't prove this. But the pattern fits:
- Day 1: Initial publish, some human curiosity
- Day 2: Drop-off, the curiosity faded
- Day 3: Spike — something systemic kicked in

If I'm right, this has massive implications for open-source discoverability. The next SEO isn't Google — it's npm keywords optimized for AI agent search.

### The Proxy Server Effect

The other factor: `npx a3m-router serve`.

This one command gives you a working OpenAI-compatible API gateway. No configuration, no API keys to start, no setup wizard. Just run it and point your existing OpenAI SDK at `http://localhost:8080/v1`.

Developers (and AI agents) can test it in 30 seconds:

```bash
# Install and start
npm install adaptive-memory-multi-model-router
npx a3m-router serve

# In another terminal — your existing OpenAI code, unchanged
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","messages":[{"role":"user","content":"hello"}]}'
```

Zero friction. Zero code changes. That's the kind of utility that spreads when an AI agent finds it and thinks "this solves the problem."

## The Download Hockey Stick

Here's the numbers again, visualized:

```
2,000 |                              ***
      |                              * *
1,500 |                              *  *
      |                              *   *
1,000 |                              *    *
      |                              *     *
  500 | ***                          *      *
      | *  *                         *       *
    0 |*    *   *  *                 *        *
      +------   ------   --------------------
        Day 1    Day 2         Day 3
         552      320          1,903
```

Day 3 is a hockey stick. Downloads went from hundreds to nearly two thousand overnight. The weekly npm badge went from 872 to 2,775 in a single day.

## What We Did Wrong (Complete Transparency)

I want to be honest about the failures because growth stories that only highlight successes are worthless.

**We built features instead of community.** We spent weeks adding providers, building the proxy server, writing tests. We spent zero time building an audience, engaging on Twitter, contributing to other projects, or writing before the launch.

**We ignored the landing page.** No website, no docs site — just a solid README and npm package. 2,775 people installed it based on the npm description alone. That's the power of good package metadata.

**We picked a terrible name.** `adaptive-memory-multi-model-router` is descriptive but impossible to remember or type. We should have branded it something short and memorable from day one.

**We launched on platforms where we had no presence.** Dev.to with 0 followers. HN with 0 karma. It's like opening a restaurant in a city where nobody knows you and expecting a line out the door.

## The v2.0 Pivot That Changed Everything

The original v1.0 was a library. You imported it, configured it, wrote code against it. Useful, but not the kind of thing that spreads.

v2.0 added the proxy server, and that changed the entire value proposition:

| Before v2.0 | After v2.0 |
|-------------|------------|
| Library you import | Service you run |
| Requires code changes | Drop-in replacement |
| Framework-specific | Works with everything |
| Need to learn the API | OpenAI-compatible |

The proxy server means you don't need to learn our API. You don't need to change your code. You don't need to rewrite your LangChain chains or your HTTP calls. You just swap `api.openai.com` for `localhost:8000` and everything works.

That's the kind of product that spreads. Not because it's better — but because it requires zero effort to try.

## The Dashboard Effect

v2.0 also added a web dashboard. You run the proxy and open `http://localhost:8081` to see:

- All 39 providers and their status
- Real-time request routing
- Cost tracking across providers
- Latency comparisons
- Memory scores (which models perform best)

The dashboard isn't just useful — it's **proof**. When someone tries the proxy for the first time, the dashboard shows them it's actually working. That builds trust instantly.

## Try It (30 Seconds to a Working AI Gateway)

If you've read this far, you might as well try it:

```bash
# Install
npm install -g adaptive-memory-multi-model-router

# Start the proxy server
npx a3m-router serve

# Test it (OpenAI-compatible!)
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

Or with the OpenAI SDK:

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'any-key-works' // proxy handles routing
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

Same SDK. Same API. Different backend. That's the point.

**GitHub:** [github.com/Das-rebel/adaptive-memory-multi-model-router](https://github.com/Das-rebel/adaptive-memory-multi-model-router)

**NPM:** [npmjs.com/package/adaptive-memory-multi-model-router](https://www.npmjs.com/package/adaptive-memory-multi-model-router)

## What's Next (And We Need Your Help)

The downloads are great, but downloads without community is just a number on a badge. Here's what we need:

1. **GitHub stars help discoverability.** If you tried A3M Router and it saved you money, a star on [GitHub](https://github.com/Das-rebel/adaptive-memory-multi-model-router) helps other developers find it.

2. **What providers do you need?** We have 39. But if your provider isn't listed, tell us. We'll add it.

3. **What features are missing?** The proxy is new. The memory system is new. We know there are gaps. Open an issue, even if it's just a one-liner.

4. **War stories.** If you tried it and something broke, tell us. If it worked in a way we didn't expect, tell us that too. Building in public means nothing if nobody talks back.

## The Honest Takeaway

I don't have a growth hack for you. We didn't crack a secret algorithm. We didn't game any system.

What happened is: we built something genuinely useful (an OpenAI-compatible proxy that talks to 39 providers), we made it trivially easy to try (`npx a3m-router serve`), and we made it findable (156 npm keywords).

Then we got lucky with timing. AI agents are becoming the primary way developers discover tools. Our keywords made us findable by those agents. The proxy made us useful once found.

That's the whole story. No secrets. No tricks. Just build useful things, make them easy to try, and make them findable.

The 2,775 downloads proved npm search is a viable growth channel. Now we're building on that foundation with benchmarks, benchmarks, and more benchmarks.

---

*If this story was useful, follow along at [github.com/Das-rebel/adaptive-memory-multi-model-router](https://github.com/Das-rebel/adaptive-memory-multi-model-router). Stars appreciated. Issues celebrated. PRs worshipped.*
