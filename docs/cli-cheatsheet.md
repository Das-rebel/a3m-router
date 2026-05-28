# A3M Router CLI Cheat Sheet

> The fastest-growing open-source LLM router on npm. Parallel multi-LLM execution with confidence-weighted voting.

---

## Installation

```bash
# TypeScript / Node (primary)
npm install -g adaptive-memory-multi-model-router
# or
npx a3m-router <command>

# Python
pip install a3m-router

# Verify installation
a3m-router --version
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `a3m-router serve` | Start OpenAI-compatible proxy server |
| `a3m-router route <query>` | Route a single query to best provider |
| `a3m-router compare <query>` | Compare providers side by side |
| `a3m-router providers` | List configured providers |
| `a3m-router test` | Test all providers for connectivity |
| `a3m-router setup` | Interactive setup wizard |
| `a3m-router recommend <task>` | Get model recommendation for a task |
| `a3m-router cost <text>` | Estimate token cost |
| `a3m-router token <text>` | Count tokens |
| `a3m-router models` | List all known models |
| `a3m-router status` | Show router status and health |
| `a3m-router benchmark` | Benchmark all providers |
| `a3m-router batch <q1> <q2>...` | Route multiple queries |
| `a3m-router memory add` | Add to memory |
| `a3m-router memory search <q>` | Search memory |
| `a3m-router memory stats` | Show memory stats |
| `a3m-router tui` | Launch terminal UI overlay |

---

## Basic Usage

```bash
# Route a query (auto-detects best provider based on complexity)
a3m-router route "What is quantum computing?"

# Force routing through a specific provider
# (via environment variable or config file)

# Compare responses from different providers
a3m-router compare "Write a poem about AI"

# Route multiple queries at once
a3m-router batch "Explain gravity" "Write hello world in Rust" "What is ML?"

# Get a model recommendation for a task
a3m-router recommend "code generation"
a3m-router recommend "creative writing"
a3m-router recommend "data extraction"
```

---

## Proxy Server

Start an OpenAI-compatible proxy server:

```bash
# Default port 8787
a3m-router serve

# Custom port
a3m-router serve --port 3000

# With host binding
a3m-router serve --host 0.0.0.0 --port 8787
```

Then use any OpenAI SDK pointing to `http://localhost:8787/v1`:

```python
import openai
client = openai.OpenAI(
    api_key="sk-unused",
    base_url="http://localhost:8787/v1"
)
response = client.chat.completions.create(
    model="auto",  # A3M auto-routes to best provider
    messages=[{"role": "user", "content": "Hello!"}]
)
```

```typescript
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: 'sk-unused',
  baseURL: 'http://localhost:8787/v1',
});
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## Programmatic Usage

### TypeScript / JavaScript

```typescript
// Main router
import { route, ensemble, createA3MRouter } from 'adaptive-memory-multi-model-router';

// Route to best provider
const result = await route({
  query: "Explain quantum computing in simple terms",
  strategy: "auto" // auto | cheapest | fastest | best
});
console.log(result.primary_model, result.content);

// Ensemble across multiple providers (P0 — core differentiator)
const ensembleResult = await ensemble({
  query: "Write a poem about artificial intelligence",
  providers: ["groq", "openai", "anthropic"], // optional: defaults to auto-select
});
console.log(ensembleResult.winner, ensembleResult.scores);

// Cost estimation
import { estimateCost, countTokens } from 'adaptive-memory-multi-model-router/cost';
const tokens = countTokens("Hello world");
const cost = estimateCost("gpt-4o", tokens);

// Memory operations
import { MemoryTree } from 'adaptive-memory-multi-model-router/memory';
const memory = new MemoryTree();
await memory.remember("user_preference", "likes short responses");

// Query with SDK (clean high-level API)
import { A3M } from 'adaptive-memory-multi-model-router/sdk';
const a3m = new A3M();
const response = await a3m.query("What is the capital of France?");
```

### Python

```python
from a3m_router import A3M

router = A3M()
result = router.route("Explain quantum computing")
print(result.model, result.content)

# Ensemble mode
results = router.ensemble("Write a poem", providers=["groq", "openai"])
print(results.winner, results.scores)
```

---

## Environment Variables

### Provider API Keys (at least one required)

| Variable | Required | Provider | Models |
|----------|:--------:|----------|--------|
| `OPENAI_API_KEY` | Recommended | OpenAI | GPT-4o, GPT-4o-mini, o1, o3 |
| `ANTHROPIC_API_KEY` | Recommended | Anthropic | Claude Sonnet 4, Opus, Haiku |
| `GOOGLE_API_KEY` | Recommended | Google / Gemini | Gemini 2.5 Flash/Pro, Gemma |
| `XAI_API_KEY` | Optional | xAI | Grok-3, Grok-2 |
| `GROQ_API_KEY` | Recommended | Groq | Llama, Mixtral (fast) |
| `CEREBRAS_API_KEY` | Optional | Cerebras | Wafer-scale inference |
| `DEEPINFRA_API_KEY` | Optional | DeepInfra | Serverless open models |
| `TOGETHER_API_KEY` | Optional | Together AI | Hosted open-source models |
| `FIREWORKS_API_KEY` | Optional | Fireworks AI | Fast open models |
| `DEEPSEEK_API_KEY` | Recommended | DeepSeek | DeepSeek-V3, DeepSeek-R1 |
| `MISTRAL_API_KEY` | Optional | Mistral AI | Mistral Large, Codestral |
| `PERPLEXITY_API_KEY` | Optional | Perplexity | Sonar (online search) |
| `COHERE_API_KEY` | Optional | Cohere | Command R+, embeddings |
| `REPLICATE_API_KEY` | Optional | Replicate | Open-source models |
| `HUGGINGFACE_API_KEY` | Optional | HuggingFace | Inference API |
| `NVIDIA_API_KEY` | Optional | NVIDIA | NVIDIA NIM |
| `OPENROUTER_API_KEY` | Optional | OpenRouter | 400+ models via one key |
| `AZURE_OPENAI_API_KEY` | Optional | Azure OpenAI | Enterprise OpenAI |
| `ZHIPU_API_KEY` | Optional | Zhipu AI | GLM series |
| `DASHSCOPE_API_KEY` | Optional | Alibaba (Qwen) | Qwen models |
| `MOONSHOT_API_KEY` | Optional | Moonshot AI | Kimi models |
| `MINIMAX_API_KEY` | Optional | MiniMax | MiniMax models |
| `STEPFUN_API_KEY` | Optional | StepFun | Step models |
| `NOVITA_API_KEY` | Optional | Novita AI | Low-cost inference |
| `SAMBANOVA_API_KEY` | Optional | SambaNova | Fast open models |
| `ANYSCALE_API_KEY` | Optional | Anyscale | Open model endpoints |
| `WRITER_API_KEY` | Optional | Writer | Palmyra models |
| `OCTOAI_API_KEY` | Optional | OctoAI | Fast custom models |
| `AI21_API_KEY` | Optional | AI21 Labs | Jamba 1.5 |
| `LAMINAR_API_KEY` | Optional | Laminar | Laminar models |
| `JINA_API_KEY` | Optional | Jina AI | Embeddings, rerank |
| `VOYAGE_API_KEY` | Optional | Voyage AI | Embeddings |

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `A3M_LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `A3M_CONFIG_DIR` | `~/.config/a3m-router` | Config directory |
| `A3M_CACHE_SIZE` | `1000` | Semantic cache entry limit |
| `A3M_BUDGET_MONTHLY` | unset | Monthly budget cap (USD) |
| `A3M_DEFAULT_STRATEGY` | `auto` | Routing strategy (auto, cheapest, fastest, best) |
| `A3M_PROXY_PORT` | `8787` | Proxy server port |
| `A3M_PROXY_ENABLED` | `true` | Enable proxy server |

---

## Terminal UI (TUI)

Launch the interactive dashboard:

```bash
# Via npm binary
a3m-tui

# Or via main package
a3m-router tui

# Or directly
node dist/tui/dashboard.js
```

TUI commands (type at prompt):

| Command | Description |
|---------|-------------|
| `/route <query>` | Route a query |
| `/cost <text>` | Estimate cost |
| `/health` | Check all providers |
| `/models` | List all models |
| `/model <provider>` | Show models for a provider |
| `/providers` | List configured providers |
| `/exit` or `Ctrl+C` | Exit TUI |

---

## Example Workflows

### Quick Health Check

```bash
# Test all configured providers
a3m-router test

# Show status
a3m-router status

# List all available models
a3m-router models

# List configured providers
a3m-router providers
```

### Cost Optimization

```bash
# Estimate cost for a prompt
a3m-router cost "Write a 500-word blog post about AI"

# Count tokens
a3m-router token "Hello, world! This is a test."

# Benchmark provider speeds
a3m-router benchmark
```

### Batch Processing

```bash
# Route multiple queries in batch
a3m-router batch \
  "What is the speed of light?" \
  "Write a haiku about coding" \
  "Explain DNS in 3 sentences"

# Compare providers on the same query
a3m-router compare "Explain the transformer architecture"
```

### Setup Wizard

```bash
# Interactive setup — auto-detects API keys from environment
a3m-router setup
```

---

## Docker

```bash
# Pull and run
docker run -p 8787:8787 \
  -e OPENAI_API_KEY=sk-... \
  -e GROQ_API_KEY=gsk_... \
  ghcr.io/das-rebel/a3m-router:latest
```

---

## Useful Aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias a3m='a3m-router'
alias a3m-route='a3m-router route'
alias a3m-compare='a3m-router compare'
alias a3m-serve='a3m-router serve'
alias a3m-health='a3m-router test'
alias a3m-cost='a3m-router cost'
alias a3m-providers='a3m-router providers'
alias a3m-status='a3m-router status'
```

---

## Further Reading

- [Quick Start Guide](./QUICK_START.md)
- [Configuration Guide](./CONFIGURATION.md)
- [API Reference](./API.md)
- [Benchmark Results](./BENCHMARK.md)
- [GitHub: Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)
- [npm: adaptive-memory-multi-model-router](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
