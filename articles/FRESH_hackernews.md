Show HN: A3M Router — 99.5% LLM routing accuracy with zero ML, 36 providers, semantic cache

A3M Router is a TypeScript LLM routing library that classifies query complexity using 5 keyword-based signals (domain detection, task indicators, query structure, action verb intensity, specificity) instead of neural networks. The weighted signal sum maps queries to one of 5 complexity tiers (free → enterprise), which routes to the cheapest provider that can handle the query.

On a 2,500-query benchmark: 99.5% ±1 tier accuracy, 64.5% exact tier match, 0.3ms routing latency. The entire routing classifier is ~200 lines of TypeScript with zero runtime dependencies and a 19.5 KB gzipped package size. 61.6% cost savings vs. sending everything to premium providers.

Supports 36 providers (OpenAI, Anthropic, Google, Groq, Cerebras, Mistral, DeepSeek, etc.) across 5 tiers. Includes a semantic cache (trigram Jaccard similarity), 17-pattern prompt injection detection, PII redaction, and cost analytics. Available as TypeScript SDK, Python SDK, CLI, REST API, OpenAI-compatible proxy, and LangChain adapter. MIT license, self-hosted, no account required.

The core insight is that keyword-based routing is within ±1 tier of BERT-based routing for nearly all queries, at zero infrastructure cost. The routing signals are composable and adjustable — if a particular domain routes poorly, you add domain-specific patterns without retraining anything.

Repo: https://github.com/Das-rebel/a3m-router
npm: https://www.npmjs.com/package/adaptive-memory-multi-model-router

Caveat: the 99.5% figure is self-benchmarked. We'd welcome independent evaluation, especially on non-English or creative writing query distributions where the keyword signals may be weaker.
