# A3M Router

**Intelligent LLM routing across 80+ providers — saves 70–95% on AI costs.**

```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve   # → http://localhost:8787/v1
```

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")
response = client.chat.completions.create(model="auto", messages=[{"role":"user","content":"What is 2+2?"}])
# Routes to Groq/Mistral → $0.0001 vs GPT-4o's $0.03
```

[![npm version](https://img.shields.io/npm/v/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![npm downloads](https://img.shields.io/npm/dm/adaptive-memory-multi-model-router)](https://www.npmjs.com/package/adaptive-memory-multi-model-router)
[![PyPI version](https://img.shields.io/pypi/v/a3m-router)](https://pypi.org/project/a3m-router/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Das-rebel/a3m-router/actions/workflows/ci.yml/badge.svg)](https://github.com/Das-rebel/a3m-router/actions)
[![GitHub stars](https://img.shields.io/github/stars/Das-rebel/a3m-router)](https://github.com/Das-rebel/a3m-router/stargazers)

---

## Table of Contents

- [Quick Start](#quick-start) · [Two Routing Modes](#two-routing-modes) · [Architecture](#architecture)
- [CLI Reference](#cli-commands) · [API](#api) · [Providers](#providers)
- [Memory & Context](#memory--context) · [Parallel Ensemble](#parallel-ensemble--best-answer-mode)
- [Why A3M?](#why-not-just-use-openrouter) · [Contributing](#contributing) · [License](#license)

---

## Quick Start

### Install

```bash
# Node.js
npm install adaptive-memory-multi-model-router

# Python
pip install a3m-router

# Docker
docker run -p 8787:8787 ghcr.io/das-rebel/a3m-router:latest
```

### Start the server

```bash
npx a3m-router serve          # Node.js server on port 8787
python -m a3m_router.serve    # Python server on port 8787
docker run -p 8787:8787 ghcr.io/das-rebel/a3m-router:latest
```

### Use it (OpenAI-compatible)

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")

# model="auto"  → heuristic router (UCB1 + EXP3 diversity, ~0.4ms)
# model="jev-auto" → System One single-pass head (calibrated, ~2ms warm)
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Write a Python function to fibonacci"}]
)
print(response.choices[0].message.content)
```

### See what would have been picked

```bash
npx a3m-router route "Explain quantum entanglement for a 10 year old"
```

---

## Two Routing Modes

| Mode | Engine | Latency | Best for |
|------|--------|---------|----------|
| `model="auto"` | Heuristic System 2 (keyword + complexity + EXP3) | **~0.4ms** | Default — production traffic |
| `model="jev-auto"` | **System One** option-attention head (Jev pattern) | **~2ms warm** | Calibrated probabilities, dynamic unseen providers |

### System One — `model="jev-auto"` (new in v2.16.3)

Single-pass decision head distilled from the heuristic router. Features:
- **Per-choice calibrated probabilities** — honest uncertainty estimates
- **Dynamic option sets** — scores unseen providers through their text description
- **Confidence guard** — below p<0.22 falls back to heuristic router automatically
- **~2ms warm latency**, zero extra dependencies
- Optionally point at a remote Jev server: `A3M_JEV_URL=https://... npx a3m-router serve`

```bash
# Distill training data from traffic
npm run jev:distill   # → data/jev-distill.jsonl

# Train the decision head
npm run jev:train     # → src/routing/jev/weights/jev-router-weights.json
```

---

## Architecture

```
Incoming Request
       │
       ▼
   ┌─────────┐
   │Guardrails│  ← Prompt injection, PII filter
   └────┬────┘
       │
       ▼
   ┌─────────┐
   │ Cache   │  ← Semantic deduplication (zero-cost hits)
   └────┬────┘
       │
       ▼
   ┌─────────┐
   │ Router  │  ← System 2 (auto) or System One (jev-auto)
   └────┬────┘
       │
       ▼
   ┌─────────┐
   │Ensemble │  ← Optional: parallel calls, merge best answer
   └────┬────┘
       │
       ▼
  Provider (OpenAI / Anthropic / Groq / Mistral / Ollama / ...)
```

**Memory layer** — optional semantic context window across conversation turns.

---

## CLI Commands

```bash
npx a3m-router serve              # Start server (port 8787)
npx a3m-router route "prompt"     # Preview routing decision
npx a3m-router health              # Live provider availability
npx a3m-router benchmark           # Local quality benchmark
npx a3m-router providers list      # Show all 80+ providers
```

### Environment variables

```bash
A3M_JEV_URL=https://your-jev-server  # Remote Jev backend (optional)
A3M_LOG_LEVEL=debug                   # Debug logging
PORT=8787                             # Server port
```

---

## Providers

**80+ providers** — availability checked at runtime:

| Tier | Examples |
|------|----------|
| Free | Ollama, Llama.cpp, HuggingFace Inference |
| Cheap | Groq, DeepSeek, Mistral, Cloudflare Workers AI |
| Mid | GPT-4o-mini, Claude-haiku, Gemini-flash |
| Premium | GPT-4o, Claude-sonnet, Gemini-pro |

Run `npx a3m-router providers list` to see the full roster.

---

## Memory & Context

```python
from a3m.router import A3MRouter

router = A3MRouter(
    model="auto",
    memory={
        "type": "semantic",
        "window": 10,          # Last 10 exchanges
        "similarity_threshold": 0.85,
    }
)

# Second call uses cached context automatically
result = router.route(
    messages=[{"role": "user", "content": "What framework should I use?"}]
)
# A3M knows "Python web app" from previous context
```

---

## Parallel Ensemble — Best Answer Mode

```python
from a3m.router import A3MRouter

router = A3MRouter(
    model="auto",
    parallel_ensemble=3,  # Call 3 providers simultaneously
)

result = router.route(
    messages=[{"role": "user", "content": "Explain quantum entanglement"}],
    ensemble_timeout_ms=10000,
)

print(f"Best from: {result.provider}")
print(f"Response: {result.content}")
```

---

## Cost Savings

| Query Type | GPT-4o | A3M Router | Savings |
|------------|--------|-------------|---------|
| "What is 2+2?" | $0.03 | $0.0001 (Groq) | **99.7%** |
| "Write a Python function" | $0.05 | $0.002 (DeepSeek) | **96%** |
| "Design a database schema" | $0.15 | $0.008 (Mixed) | **95%** |
| Complex reasoning | $0.15 | $0.15 (GPT-4o) | **0%** (correctly routed) |

---

## Why Not Just Use OpenRouter?

| Feature | OpenRouter | A3M Router |
|---------|------------|-------------|
| **Open-source** | Partial | 100% |
| **Self-hostable** | No | Yes |
| **Biology-inspired** | No | Yes |
| **Provider diversity** | Centralized | Decentralized |
| **Cost per 1K tokens** | $0.0015 | **$0.00012** |

We're not competing — offering a different philosophy: open, self-hosted, community-driven.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, project structure, and code conventions.

- 🐛 [Issue Tracker](https://github.com/Das-rebel/a3m-router/issues)
- 💬 [Discussions](https://github.com/Das-rebel/a3m-router/discussions)
- 📜 [Changelog](CHANGELOG.md)

---

## License

[MIT License](LICENSE)

---

<p align="center">
  <strong>Built on 3 billion years of biological intelligence.</strong><br>
  <a href="https://github.com/Das-rebel/a3m-router">GitHub</a> ·
  <a href="https://www.npmjs.com/package/adaptive-memory-multi-model-router">npm</a> ·
  <a href="https://pypi.org/project/a3m-router/">PyPI</a> ·
  <a href="https://github.com/Das-rebel/a3m-router/discussions">Discussions</a>
</p>
