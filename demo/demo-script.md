# A3M Router Demo Script for GIF/Video

## Scene 1: Installation (5 seconds)
```bash
npm install adaptive-memory-multi-model-router
```
Show: Fast installation, dependency count (just nanoid)

## Scene 2: CLI Providers Command (8 seconds)
```bash
npx a3m-router providers
```
Show: Table of 9 configured providers with checkmarks
Highlight: Groq, Cerebras, Mistral, CommandCode, OpenCode

## Scene 3: Route Query (10 seconds)
```bash
npx a3m-router route "Write Python to sort an array"
```
Show: Routing result
- Primary: groq/llama-3.3-70b
- Fallbacks: mistral/medium, cerebras/llama
- Est. Cost: $0.0004
- Reason: code detected

## Scene 4: Compare Providers (12 seconds)
```bash
npx a3m-router compare "What is 2+2?"
```
Show: Side-by-side comparison
- Groq: "4" 450ms $0.0001
- Cerebras: "4" 380ms $0.0001
- Mistral: "4" 520ms $0.0002

## Scene 5: Benchmark All (15 seconds)
```bash
npx a3m-router benchmark
```
Show: Ranking table
- Fastest: Cerebras 380ms
- Cheapest: CommandCode FREE
- Best Quality: Mistral 96%

## Scene 6: Code Example (10 seconds)
```javascript
const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter();
const result = await router.route("Explain quantum physics");
console.log(result.primary_model); // "mistral/mistral-large"
```

## Total Duration: ~60 seconds
## Tools: terminalizer, asciinema, or simple screen recording
