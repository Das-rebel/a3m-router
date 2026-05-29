# [Project] Built an LLM router over a weekend. 2,775 npm downloads in 3 days from pure keyword search. Here's what I learned about npm as a growth channel.

Hey r/SideProject — wanted to share something unexpected that happened with my side project and what I learned from it.

## The project

I built **A3M Router** — a TypeScript package that routes LLM queries to the cheapest provider that can handle them. 36 providers, 5 complexity tiers, semantic caching, injection guardrails. The whole package is 19.5 KB gzipped. MIT license, no account needed, self-hosted.

Repo: https://github.com/Das-rebel/a3m-router
npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router

## The surprising part: the downloads

I published it on a Friday. By Monday, it had 2,775 downloads. No Product Hunt launch. No Twitter thread. No newsletter. No blog post. No "show HN" (yet). No influencers.

It was **entirely from npm keyword search discovery**.

People were literally searching npm for things like "llm router", "openai proxy", "llm cost", "model router", "ai gateway" — and finding the package. The npm search algorithm surfaced it, people clicked through, and the download numbers grew organically.

## What I learned about npm SEO

This was accidental, but here's what I think happened:

**1. Package name matters more than you think.**

The package name is `adaptive-memory-multi-model-router`. It's long, but it contains the actual keywords people search for: "multi model", "router". The name IS the SEO.

**2. npm keyword fields are underrated.**

I filled out the `keywords` array in `package.json` with every relevant search term I could think of: `llm`, `router`, `openai`, `anthropic`, `proxy`, `gateway`, `cost-optimization`, `semantic-cache`, etc. This is basically the meta tags of the npm ecosystem and most developers leave it empty or generic.

**3. The README is the landing page.**

npm renders your README as the package homepage. I treated it like a landing page: clear value prop at the top, quick start code, comparison table, feature list. No walls of text. Code first.

**4. "Zero config" and "no account required" are conversion drivers.**

Every competing LLM router I found (Helicone, Portkey, LiteLLM) requires creating an account, getting an API key from THEIR service, or running a Docker container. My package is `npm install` + set your provider keys + done. No middleman account. That friction difference matters a lot for developers evaluating options.

**5. npm's search algorithm seems to weight freshness + keyword match.**

The package was new and matched high-intent keywords. I think that's why it surfaced. As it ages, I expect download velocity to normalize unless people keep starring/using it.

## What actually works in the package (the tech)

- **76.43  accuracy** on routing (5-signal keyword classifier, no ML)
- **61.6% cost savings** vs. using premium models for everything
- **36 providers** (6 free, 15 cheap, 9 mid, 3 premium, 3 enterprise)
- **Semantic cache** using trigram Jaccard similarity — catches repeat/near-duplicate queries
- **Guardrails**: 17-pattern prompt injection detection, PII redaction, hallucination checks
- **19.5 KB gzipped** — no ML weights, no Python dependency, pure TypeScript
- SDKs for TypeScript and Python, plus CLI, REST API, OpenAI-compatible proxy, and LangChain adapter

## What didn't work

- **GitHub stars:** Still very early on stars. Downloads != stars. People install, evaluate, and move on.
- **Documentation:** I underestimated how much people want copy-paste examples for every provider. Working on that.
- **The name is too long.** For CLI usage, people want something shorter. Considering an alias.

## Next steps

- OpenAI-compatible proxy server (done, but needs docs)
- Python SDK (done, needs PyPI publish)
- Benchmark against RouteLLM on the same dataset
- Proper benchmarking with independent evaluators

If you're building a dev tool, **take npm keyword search seriously**. It's an organic discovery channel that most people ignore. Fill out your keywords. Write a scannable README. Make install + first-run take under 2 minutes.

Happy to answer questions about the routing algorithm, the npm discovery, or the architecture.

GitHub: https://github.com/Das-rebel/a3m-router
npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router
