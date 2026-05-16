# A3M Router API Documentation

## Table of Contents

- [Core Functions](#core-functions)
- [Memory Module](#memory-module)
- [Compression Module](#compression-module)
- [Auto-Fetch Module](#auto-fetch-module)
- [OAuth Module](#oauth-module)
- [Provider Registry](#provider-registry)
- [Cost Tracker](#cost-tracker)
- [Circuit Breaker](#circuit-breaker)

---

## Core Functions

### createA3MRouter

Creates an A3M Router instance with specified configuration.

```javascript
import { createA3MRouter } from 'adaptive-memory-multi-model-router';

const router = createA3MRouter({
  memory: true,           // Enable memory tree
  costBudget: 0.05,      // Max cost per request in USD
  providers: ['openai', 'groq', 'anthropic'],  // Enabled providers
  maxLatency: 2000,     // Max latency in ms
  cacheEnabled: true     // Enable caching
});
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `memory` | boolean | `false` | Enable memory tree |
| `costBudget` | number | `0.10` | Max cost per request |
| `providers` | string[] | `['openai']` | Enabled providers |
| `maxLatency` | number | `5000` | Max latency in ms |
| `cacheEnabled` | boolean | `true` | Enable response cache |

**Returns:** `A3MRouter` instance

---

### router.route()

Routes a request to the optimal provider.

```javascript
const result = await router.route({
  prompt: 'Your prompt here',
  context: { 
    type: 'coding',    // 'coding', 'analysis', 'creative'
    language: 'python',  // Optional language hint
    domain: 'tech'       // Optional domain hint
  },
  options: {
    maxCost: 0.02,
    maxLatency: 2000
  }
});
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `prompt` | string | The input prompt |
| `context` | object | Routing context |
| `options.maxCost` | number | Max cost for this request |
| `options.maxLatency` | number | Max latency in ms |

**Returns:**

```javascript
{
  output: 'Response text',
  provider: 'openai',
  model: 'gpt-4o',
  cost: 0.0015,
  latency: 850,
  tokens: { prompt: 150, completion: 200 }
}
```

---

## Memory Module

### MemoryTree

Hierarchical memory with LRU cache and fast index.

```javascript
import { MemoryTree } from 'adaptive-memory-multi-model-router/memory';

const tree = new MemoryTree(maxChunkSize = 3000);
```

#### tree.add(data)

Adds data to memory tree.

```javascript
await tree.add('Your context content here');
await tree.add('More content for the tree');
```

#### tree.search(query)

Fast indexed search.

```javascript
const results = tree.search('keyword');
// Returns: [{ id, content, score, accessCount, ... }]
```

#### tree.getContext(maxTokens)

Gets context for routing.

```javascript
const context = tree.getContext(3000);
// Returns: concatenated context string
```

#### tree.toMarkdown()

Exports memory as Obsidian-compatible markdown.

```javascript
const md = tree.toMarkdown();
fs.writeFileSync('./memory.md', md);
```

#### tree.getStats()

Returns tree statistics.

```javascript
const stats = tree.getStats();
// { totalChunks, maxDepth, indexSize, lruSize }
```

---

### EpisodicMemoryStore

Episodic memory for routing decisions.

```javascript
import { EpisodicMemoryStore } from 'adaptive-memory-multi-model-router';

const memory = new EpisodicMemoryStore();
```

#### memory.record(request, response, routing)

Records a routing decision.

```javascript
await memory.record(request, response, {
  provider: 'openai',
  model: 'gpt-4o',
  reasoning: 'Simple query, fast model sufficient'
});
```

#### memory.getSimilar(request)

Gets similar past requests.

```javascript
const similar = await memory.getSimilar({ prompt: 'Debug Python' });
// Returns routing decisions for similar prompts
```

---

### ObsidianVault

Exports routing decisions as markdown files.

```javascript
import { ObsidianVault } from 'adaptive-memory-multi-model-router/vault';

const vault = new ObsidianVault({ path: './vault' });
```

#### vault.saveDecision(decision)

Saves a routing decision as markdown.

```javascript
await vault.saveDecision({
  id: 'decision-001',
  timestamp: Date.now(),
  prompt: 'Explain quantum',
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  reasoning: 'Complex topic, use best model',
  cost: 0.003,
  latency: 1200
});
```

#### vault.getRecentDecisions(count)

Gets recent decisions.

```javascript
const recent = vault.getRecentDecisions(10);
```

---

## Compression Module

### EnhancedCompression

TokenJuice-style compression with caching.

```javascript
import { EnhancedCompression } from 'adaptive-memory-multi-model-router/compression';

const compressor = new EnhancedCompression();
```

#### compressor.compress(text)

Compresses text (HTML→Markdown, URL shortening, etc).

```javascript
const compressed = compressor.compress('<h1>Hello</h1><p>URL: https://very-long-url.com</p>');
// Returns: '# Hello\n\nURL: very-long-url.com/...'
```

#### compressor.getStats(original, compressed)

Gets compression statistics.

```javascript
const stats = compressor.getStats(original, compressed);
// { original: 200, compressed: 80, reduction: '60.0%', ratio: '0.40' }
```

---

### isonEncode / isonDecode

ISON format compression.

```javascript
import { isonEncode, isonDecode } from 'adaptive-memory-multi-model-router/utils/compression';

const encoded = isonEncode(messages);
const decoded = isonDecode(encoded);
```

---

## Auto-Fetch Module

### AutoFetch

Periodically syncs data from connected tools.

```javascript
import { AutoFetch } from 'adaptive-memory-multi-model-router/autofetch';

const fetcher = new AutoFetch({
  intervalMs: 20 * 60 * 1000, // 20 minutes
  targets: ['github', 'notion', 'slack', 'gmail', 'calendar']
});
```

#### fetcher.start()

Starts the sync loop.

```javascript
fetcher.start();
```

#### fetcher.syncAll()

Triggers immediate sync.

```javascript
const results = await fetcher.syncAll();
// Returns: Map<target, SyncResult>
```

#### fetcher.stop()

Stops the sync loop.

```javascript
fetcher.stop();
```

#### fetcher.getStats()

Gets sync statistics.

```javascript
const stats = fetcher.getStats();
// { totalTargets: 5, failedTargets: 0 }
```

---

## OAuth Module

### OAuthManager

One-click OAuth for integrations.

```javascript
import { OAuthManager } from 'adaptive-memory-multi-model-router/oauth';

const oauth = new OAuthManager();
```

#### oauth.configure(provider, config)

Configures an OAuth provider.

```javascript
oauth.configure('github', {
  clientId: 'your-client-id',
  clientSecret: 'your-secret',
  redirectUri: 'http://localhost:3000/callback'
});
```

#### oauth.getAuthUrl(provider)

Gets authorization URL.

```javascript
const url = oauth.getAuthUrl('github');
// Opens OAuth flow
```

#### oauth.handleCallback(provider, code, state)

Handles OAuth callback.

```javascript
const tokens = await oauth.handleCallback('github', code, state);
```

#### oauth.isConnected(provider)

Checks if provider is connected.

```javascript
const connected = oauth.isConnected('github');
```

#### oauth.getAccessToken(provider)

Gets valid access token (auto-refreshes).

```javascript
const token = await oauth.getAccessToken('github');
```

---

## Provider Registry

### ProviderRegistry

Manages 14 LLM providers.

```javascript
import { ProviderRegistry } from 'adaptive-memory-multi-model-router/providers';

const registry = new ProviderRegistry();
```

#### registry.getReadyProviders()

Gets currently available providers.

```javascript
const ready = registry.getReadyProviders();
// ['openai', 'groq', 'anthropic']
```

#### registry.selectModel()

Selects optimal model based on cost-latency tradeoff.

```javascript
const model = registry.selectModel();
// 'openai/gpt-4o'
```

#### registry.recordSuccess(provider)

Records successful request.

```javascript
registry.recordSuccess('openai');
```

#### registry.recordFailure(provider)

Records failed request.

```javascript
registry.recordFailure('openai');
```

---

## Cost Tracker

### CostTracker

Tracks request costs and budgets.

```javascript
import { CostTracker } from 'adaptive-memory-multi-model-router/cost';

const tracker = new CostTracker();
```

#### tracker.record(requestInfo)

Records a request.

```javascript
tracker.record({
  provider: 'openai',
  model: 'gpt-4o',
  promptTokens: 150,
  completionTokens: 200,
  cost: 0.003
});
```

#### tracker.getSummary()

Gets cost summary.

```javascript
const summary = tracker.getSummary();
// { totalRequests, totalCost, byProvider, byModel }
```

#### tracker.getRemainingBudget(provider)

Gets remaining budget.

```javascript
const remaining = tracker.getRemainingBudget('openai');
```

---

## Circuit Breaker

### CircuitBreaker

Prevents cascading failures.

```javascript
import { CircuitBreaker } from 'adaptive-memory-multi-model-router/utils/reliability';

const breaker = new CircuitBreaker({
  name: 'openai',
  failureThreshold: 3,
  resetTimeout: 60000
});
```

#### breaker.canExecute()

Checks if request can proceed.

```javascript
if (breaker.canExecute()) {
  // Proceed with request
}
```

#### breaker.recordSuccess()

Records success.

```javascript
breaker.recordSuccess();
```

#### breaker.recordFailure()

Records failure.

```javascript
breaker.recordFailure();
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `a3m-router route "prompt"` | Route to optimal model |
| `a3m-router parallel "t1" "t2" "t3"` | Parallel execution |
| `a3m-router compare "prompt"` | Compare models |
| `a3m-router cost` | Show cost summary |
| `a3m-router count "text"` | Count tokens |
| `a3m-router compress "text"` | Compress text |
| `a3m-router local "prompt"` | Local Ollama |
| `a3m-router providers` | List providers |

---

## Error Handling

```javascript
import { CircuitBreaker, withRetry } from 'adaptive-memory-multi-model-router';

const breaker = new CircuitBreaker({ name: 'test' });

try {
  const result = await withRetry(
    () => router.route({ prompt: 'test' }),
    { maxRetries: 3, retryDelay: 1000 }
  );
} catch (error) {
  if (breaker.getState().status === 'open') {
    console.log('Circuit open - using fallback');
  }
}
```

---

## TypeScript Support

A3M Router is written in TypeScript with full type definitions.

```typescript
import { createA3MRouter, type A3MRouterConfig } from 'adaptive-memory-multi-model-router';

const config: A3MRouterConfig = {
  memory: true,
  costBudget: 0.05,
  providers: ['openai', 'groq']
};

const router = createA3MRouter(config);
```
