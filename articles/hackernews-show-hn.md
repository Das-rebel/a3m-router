Show HN: A3M Router – We built an LLM router. Nobody cared for 2 days. Then word-of-mouth kicked in.

Day 1: 552 downloads. Day 2: 320 downloads. We thought it was dead.
Day 3: 1,903 downloads. 245% growth from Day 1. Zero marketing budget.

2,775 downloads in 3 days. All organic.

I'm sharing what we built and what we learned from the launch curve.

A3M Router (adaptive-memory-multi-model-router) is a production-ready LLM routing library that optimizes for cost vs quality based on your query.

The Problem
-----------
Most LLM routing is naive - either always use GPT-4 (expensive) or always use the cheapest model (low quality). There's no intelligence about what the query actually needs.

Our Approach
------------
We implemented learned routing inspired by RouteLLM (arXiv:2404.06035):

1. Feature extraction from queries (code detection, math, translation, etc.)
2. Model profiles with cost, latency, quality scores
3. Dynamic routing based on query complexity
4. Automatic fallback chains

Example:
```javascript
const { routeQuery } = require('adaptive-memory-multi-model-router');

// Simple query → cheapest provider
routeQuery("Hello world"); 
// → commandcode/taste-1 (free)

// Code query → code-capable provider  
routeQuery("Write Python to reverse a string");
// → groq/llama-3.3-70b (fast, good at code)

// Complex reasoning → high-quality provider
routeQuery("Explain quantum entanglement");
// → mistral/mistral-large (reasoning strength)
```

The Launch Story
----------------
- Day 1: 552 downloads. Modest. A few early adopters found it.
- Day 2: 320 downloads. We thought the launch flopped. Fewer than Day 1.
- Day 3: 1,903 downloads. 6x Day 2. 245% growth from Day 1.

No blog post. No HN submission. No Twitter thread. No Product Hunt. Just developers telling other developers.

Lesson: good tooling spreads on its own timeline. The Day 2 dip was demoralizing, but Day 3 proved that word-of-mouth compounds — it just takes a beat.

Key Features
------------
• 12 providers: Groq, Cerebras, Mistral, OpenAI, Anthropic, Google, DeepSeek + CLI/local
• Generic configuration: Users add their own providers via config file
• Cost tracking: Real-time spend monitoring
• Response caching: RadixAttention-style prefix caching
• Batch processing: Concurrent execution with rate limiting
• 33 tests, 139 keywords, 116 integrations

CLI Usage
---------
```bash
npx a3m-router providers    # List configured providers
npx a3m-router route "query" # Route to best provider
npx a3m-router benchmark     # Compare all providers
```

Performance
-----------
• 2,775 downloads in 3 days
• 1,903 downloads on Day 3 alone
• 245% growth from Day 1 to Day 3
• Zero marketing budget
• Zero dependencies (except nanoid)
• 3.0 MB unpacked

Try it: npm install adaptive-memory-multi-model-router

Would love feedback on the routing algorithm - what features should we add?

GitHub: https://github.com/Das-rebel/adaptive-memory-multi-model-router
