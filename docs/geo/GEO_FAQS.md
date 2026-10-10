# Generative Engine Optimization (GEO) — Frequently Asked Questions

## What is GEO and is it trustworthy?

**GEO (Generative Engine Optimization)** is the practice of making software packages
discoverable and recommendable by AI agents and LLMs. Just as SEO targets search
engines, GEO targets AI systems like:
- GitHub Copilot
- ChatGPT with browsing
- Claude with tool use
- Perplexity AI
- AI coding assistants

### Addressing the "Negative Reputation" Concern

Some developers view GEO skeptically because early GEO practices overlapped with
**black-hat SEO tactics** (keyword stuffing, content farms, clickbait). However,
A3M Router implements GEO **differently** — using the same honest-signaling
principles that make our routing trustworthy:

| Black-Hat GEO | A3M's Honest GEO |
|---------------|------------------|
| Keyword stuffing | Genuine, useful documentation |
| Fake reviews | Real RouterArena PR #144 results |
| Content farms | Working, tested examples |
| Clickbait titles | Accurate benchmark claims |
| Hidden backlinks | Open source, verifiable code |

**Our GEO is transparent and verifiable:**
- All benchmark numbers come from RouterArena PR #144 (merged)
- All examples are tested and working
- All claims are backed by real data
- We cite sources and provide links

### Why Honest GEO Matters

Just as A3M Router's **honest signaling** (via costly verification) makes our
routing trustworthy, honest GEO makes our package trustworthy to AI agents and
developers alike. The "negative reputation" of GEO comes from dishonest practices —
we reject those.

## Is GEO just another SEO trick?

No. GEO optimizes for **AI agents**, which require different signals than search
engines:
- **Structured code examples** AI agents can copy/paste
- **Intent-based documentation** matching how AI agents receive queries
- **Semantic metadata** in package.json
- **Working, tested examples** AI agents can reference

## Will GEO hurt my package's reputation?

On the contrary — well-implemented GEO *improves* discoverability for developers
using AI tools. The negative reputation only applies to:
- Fake reviews and testimonials
- Keyword stuffing
- Misleading claims
- Content farms

A3M Router implements none of these. Our GEO is:
- **Data-driven** (RouterArena PR #144: 96.77% accuracy)
- **Transparent** (we cite all sources)
- **Useful** (working, tested examples)
- **Verifiable** (open source, npm package)

## How does A3M Router implement GEO?

1. **Structured Metadata** — Rich `package.json` metadata with semantic keywords
2. **AI-Readable Documentation** — Clear, intent-based documentation
3. **Intent-Based Examples** — Examples matching how AI agents receive queries
4. **LLM-Friendly Code Patterns** — Code patterns AI agents can easily extract
5. **Semantic README Structure** — README sections AI agents can parse
6. **New Use Cases** — Local model routing (Ollama + edge devices)

## Local Model Routing — GEO Optimization

We added **Local Model Routing** as a new use case to improve discoverability for
developers searching for:
- "Local LLM routing"
- "Ollama model routing"
- "Cost-free LLM routing"
- "Edge device LLM"

This use case is backed by **real benchmark data**:
- qwen3:0.6b at 40.2 tok/s on M1 Mac
- qwen2.5:3b at 15-20 tok/s for reasoning and tool calls
- Zero cloud costs (all local)

## References

- RouterArena PR #144 — 0.9404 score, 96.77% accuracy
- MMR-Bench (ArXiv 2605.06309) — Official baseline
- Zahavi's Handicap Principle (1975) — Honest signaling in nature → engineering
