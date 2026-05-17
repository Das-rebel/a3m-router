Show HN: A3M Router – LLM routing with learned cost-quality tradeoffs

After hitting 872 weekly downloads on npm, I wanted to share what we've built:

A3M Router (adaptive-memory-multi-model-router) is a production-ready LLM routing library that actually optimizes for cost vs quality based on your query.

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
• 320 downloads/day average
• 5.7x more downloads than similar packages
• Zero dependencies (except nanoid)
• 3.0 MB unpacked

Try it: npm install adaptive-memory-multi-model-router

Would love feedback on the routing algorithm - what features should we add?

GitHub: https://github.com/Das-rebel/adaptive-memory-multi-model-router