# A3M Router - Quick Start Guide

## 5-Minute Setup

### Step 1: Install

```bash
npm install adaptive-memory-multi-model-router
```

### Step 2: Basic Usage

```javascript
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const router = createA3MRouter({
  memory: true,
  costBudget: 0.05
});

// Route a request
const result = await router.route({
  prompt: 'Explain quantum entanglement'
});

console.log(result.output);
console.log('Provider:', result.provider);
console.log('Cost:', result.cost);
```

### Step 3: Add Integrations

```javascript
import { createIntegration } from 'adaptive-memory-multi-model-router/integrations';

// GitHub
const github = createIntegration('github', { apiKey: process.env.GITHUB_TOKEN });
await github.createIssue('owner', 'repo', 'Bug', 'Fix this');

// Slack
const slack = createIntegration('slack', { webhookUrl: process.env.SLACK_WEBHOOK });
await slack.sendMessage('#team', 'Build complete!');
```

---

## Examples

### Example 1: Smart Routing with Memory

```javascript
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const router = createA3MRouter({
  memory: true,        // Enable memory tree
  costBudget: 0.05,    // Max $0.05 per request
  providers: ['openai', 'groq', 'anthropic', 'cerebras']
});

async function handleUserQuery(query) {
  // Route with context from memory
  const result = await router.route({
    prompt: query,
    context: {
      type: detectIntent(query),
      history: memory.getContext(2000)
    }
  });
  
  // Learn from this interaction
  memory.add({ query, response: result.output, provider: result.provider });
  
  return result;
}
```

### Example 2: Batch Processing

```javascript
import { batchProcess } from 'adaptive-memory-multi-model-router';

const tasks = [
  'Analyze this data',
  'Write unit tests',
  'Document API',
  'Review PR',
  'Write release notes'
];

const results = await batchProcess(tasks, {
  maxParallel: 3,
  provider: 'openai'
});

results.forEach((result, i) => {
  console.log(`Task ${i+1}: ${result.output.slice(0, 50)}...`);
});
```

### Example 3: Cost-Optimized Routing

```javascript
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const router = createA3MRouter({
  costBudget: 0.02,  // Very low budget
  providers: ['groq', 'cerebras']  // Fast + free tier
});

// Simple queries go to fast free providers
// Complex queries route to best available

const queries = [
  'What is 2+2?',           // → Groq (fast, free)
  'Explain black holes',      // → Cerebras (free tier)
  'Debug my 10k line program'  // → Cerebras (best available)
];

for (const query of queries) {
  const result = await router.route({ prompt: query });
  console.log(`${query.slice(0, 30)}... → ${result.provider} ($${result.cost.toFixed(4)})`);
}
```

### Example 4: Auto-Fetch for Context

```javascript
import { AutoFetch } from 'adaptive-memory-multi-model-router/autofetch';
import { MemoryTree } from 'adaptive-memory-multi-model-router/memory';

const fetcher = new AutoFetch({
  intervalMs: 20 * 60 * 1000,  // 20 minutes
  targets: ['github', 'notion', 'slack']
});

const memory = new MemoryTree();

fetcher.start();

// On each sync, memory automatically updated
fetcher.on('sync', (target, data) => {
  memory.add(data);
  console.log(`${target} synced, memory now has ${memory.getStats().totalChunks} chunks`);
});

// Now routing has fresh context
const result = await router.route({
  prompt: userQuery,
  context: { context: memory.getContext(3000) }
});
```

### Example 5: Compression for Large Contexts

```javascript
import { EnhancedCompression } from 'adaptive-memory-multi-model-router/compression';

const compressor = new EnhancedCompression();

// Compress HTML content
const htmlContent = `
  <html><body>
    <h1>Document Title</h1>
    <p>This is a very long paragraph with a very long URL: 
    https://example.com/very/very/very/very/very/long/path/that/should/be/shortened</p>
  </body></html>
`;

const compressed = compressor.compress(htmlContent);
// Output: '# Document Title\n\nThis is a very long paragraph with a URL: example.com/...'

console.log('Reduced from', htmlContent.length, 'to', compressed.length, 'chars');
```

### Example 6: Obsidian Vault for Audit Trail

```javascript
import { ObsidianVault } from 'adaptive-memory-multi-model-router/vault';
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const vault = new ObsidianVault({ path: './my-vault' });
const router = createA3MRouter();

router.on('route', async (request, result) => {
  // Save every routing decision
  await vault.saveDecision({
    id: generateId(),
    timestamp: Date.now(),
    prompt: request.prompt,
    selectedProvider: result.provider,
    selectedModel: result.model,
    reasoning: result.reasoning,
    cost: result.cost,
    latency: result.latency
  });
});

// Later, review routing decisions in Obsidian
const recent = vault.getRecentDecisions(50);
// Open ./my-vault/routing-index.md in Obsidian to browse
```

---

## CLI Quick Reference

```bash
# Route a query
a3m-router route "Explain quantum computing"

# Parallel execution
a3m-router parallel "task1" "task2" "task3"

# Compare models
a3m-router compare "Write a haiku"

# Cost summary
a3m-router cost

# Token counting
a3m-router count "Your text here"

# Compress text
a3m-router compress "<html>content</html>"

# Local Ollama
a3m-router local "Write Python hello world"
```

---

## Environment Variables

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=...

# Integrations
GITHUB_TOKEN=ghp_...
SLACK_WEBHOOK=https://hooks.slack.com/...
PINECONE_API_KEY=...
STRIPE_API_KEY=sk_...

# Optional
LOG_LEVEL=info
CACHE_TTL=3600
```

---

## Next Steps

1. **Read the full [API Documentation](API.md)**
2. **Explore [116 Integrations](INTEGRATIONS.md)**
3. **Deploy to production** with proper monitoring
4. **Join the community** for support

---

## Performance Tips

| Tip | Impact |
|-----|--------|
| Use memory tree | 10x faster routing |
| Enable compression | 2-5x less tokens |
| Use batch processing | 3x throughput |
| Configure cost budgets | 40% cost savings |
| Use provider caching | 5x fewer API calls |
