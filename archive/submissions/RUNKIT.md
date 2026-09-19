# Try A3M Router in Your Browser

You can try A3M Router right now without installing anything.

## Option 1: RunKit Notebook (No-Code Browser Demo)

[![RunKit](https://runkit.com/badge.svg)](https://runkit.com/npm/adaptive-memory-multi-model-router)

1. Go to **[RunKit](https://runkit.com/npm/adaptive-memory-multi-model-router)**
2. Paste the following code:

```javascript
const a3m = require('adaptive-memory-multi-model-router');

// Route a query to the fastest available provider
async function tryIt() {
  const result = await a3m.routeQuery({
    query: "What is 2+2?",
    strategy: "fastest"
  });
  console.log(JSON.stringify(result, null, 2));
}

tryIt();
```

3. Click **Run** — no signup required.

You can also try ensemble voting across multiple providers:

```javascript
const a3m = require('adaptive-memory-multi-model-router');

// Compare results from 3 providers in parallel
async function compareProviders() {
  const query = "Explain quantum entanglement in one sentence.";

  const [fastest, cheapest, best] = await Promise.all([
    a3m.routeQuery({ query, strategy: 'fastest' }),
    a3m.routeQuery({ query, strategy: 'cheapest' }),
    a3m.routeQuery({ query, strategy: 'best' }),
  ]);

  console.log('=== FASTEST ===');
  console.log(fastest.primary_model, '|', fastest.content.slice(0, 120));
  console.log('\n=== CHEAPEST ===');
  console.log(cheapest.primary_model, '|', cheapest.content.slice(0, 120));
  console.log('\n=== BEST QUALITY ===');
  console.log(best.primary_model, '|', best.content.slice(0, 120));
}

compareProviders();
```

## Option 2: Free NVIDIA API (via npx, no API key needed)

```bash
npx adaptive-memory-multi-model-router route "Hello world" --provider nvidia
```

This uses NVIDIA's free inference API tier — zero cost, zero setup.

```bash
# Try more examples
npx a3m-router route "What is the capital of France?" --provider groq
npx a3m-router route "Write a haiku about AI" --strategy cheapest
npx a3m-router route "Summarize quantum computing" --strategy fastest

# Interactive TUI
npx a3m-router tui
```

## Option 3: Local Installation

```bash
npm install -g adaptive-memory-multi-model-router
a3m-router route "Hello world"
a3m-router tui
```

---

**A3M Router** — Parallel multi-LLM execution engine with confidence-weighted ensemble voting, semantic cache, and budget enforcement. 47+ providers. 62% cost savings.
