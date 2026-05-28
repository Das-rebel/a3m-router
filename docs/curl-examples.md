# Try A3M Router With One Curl Command

> No install. No signup. Just curl.

Jump to: [Free Providers](#free-providers) | [A3M Proxy](#a3m-proxy-localhost8787) | [Comparison](#quick-provider-comparison) | [NVIDIA NIM Catalog](#nvidia-nim-catalog) | [Diagnostics](#diagnostics--debugging)

---

## Free Providers

Try LLMs right now with a free API key. No credit card required.

### Groq (fastest inference, 30 req/min free)

```bash
curl -s https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}]
  }' | jq -r '.choices[0].message.content'
```

**Other Groq models:** `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`

### NVIDIA NIM (free inference API)

```bash
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}]
  }' | jq -r '.choices[0].message.content'
```

**Other NIM models:** `mistralai/mistral-7b-instruct-v0.3`, `google/gemma-2-27b-it`, `nvidia/llama-3.1-nemotron-70b-instruct`

> **Get a free NVIDIA API key:** https://build.nvidia.com/

### Cerebras (free, ultra-low latency)

```bash
curl -s https://api.cerebras.ai/v1/chat/completions \
  -H "Authorization: Bearer $CEREBRAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}]
  }' | jq -r '.choices[0].message.content'
```

### HuggingFace Inference API (free tier)

```bash
curl -s https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions \
  -H "Authorization: Bearer $HF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}]
  }' | jq -r '.choices[0].message.content'
```

---

## A3M Proxy (localhost:8787)

After `docker compose up` or `npx a3m-router serve`:

### Auto-route (cheapest capable model)

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "What is the capital of France?"}]
  }'
```

### Route without executing (preview the decision)

```bash
curl -X POST http://localhost:8787/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a Python function to sort a list"}'
```

Returns model selection, confidence score, estimated cost, and reasoning — without spending a penny.

### List available models

```bash
curl http://localhost:8787/v1/models | jq '.data[].id'
```

### Health check

```bash
curl http://localhost:8787/health | jq '.status'
```

### Force a specific provider

```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "groq/llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Quick Provider Comparison

Spin up A3M Proxy, then compare responses from different providers to the _same_ prompt:

```bash
# Terminal 1: start the proxy
npx a3m-router serve
```

```bash
# Terminal 2: compare providers
for provider in auto groq/llama-3.3-70b-versatile cerebras/llama-3.3-70b; do
  echo "=== $provider ==="
  curl -s http://localhost:8787/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"$provider\", \"messages\": [{\"role\": \"user\", \"content\": \"Explain quantum entanglement in one sentence.\"}]}" \
    | jq -r '.choices[0].message.content'
  echo
done
```

Or compare via the [compare-providers.sh](../scripts/compare-providers.sh) script.

---

## NVIDIA NIM Catalog

NVIDIA's build.nvidia.com hosts 100+ free models. Here's the pattern:

```bash
# Any NIM model follows this URL pattern:
# POST https://integrate.api.nvidia.com/v1/chat/completions
# model: "{org}/{model-name}"

# Meta Llama variants
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "meta/llama-3.1-405b-instruct", "messages": [{"role":"user","content":"Hi"}]}'

# Mistral
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "mistralai/mistral-7b-instruct-v0.3", "messages": [{"role":"user","content":"Hi"}]}'

# Google Gemma
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "google/gemma-2-27b-it", "messages": [{"role":"user","content":"Hi"}]}'

# Nemotron (NVIDIA's own)
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "nvidia/llama-3.1-nemotron-70b-instruct", "messages": [{"role":"user","content":"Hi"}]}'
```

---

## Diagnostics & Debugging

### See what model A3M chose

The proxy returns the selected `model` in the response:

```bash
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}' \
  | jq '.model, .choices[0].message.content'
```

### Check which providers are healthy

```bash
curl -s http://localhost:8787/health | jq '.providers.details | to_entries[] | select(.value.available == true) | .key'
```

### Token usage estimate

```bash
curl -s http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Write a haiku"}]}' \
  | jq '.usage'
```

### Cost summary (from A3M analytics)

```bash
curl -s http://localhost:8787/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query":"Write a haiku"}' \
  | jq '.estimated_cost'
```

---

## One-Liner Cheat Sheet

```bash
# Groq — fastest free inference
curl -s https://api.groq.com/openai/v1/chat/completions -H "Authorization: Bearer $GROQ_API_KEY" -H "Content-Type: application/json" -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hi"}]}' | jq -r '.choices[0].message.content'

# NVIDIA NIM — 100+ free models
curl -s https://integrate.api.nvidia.com/v1/chat/completions -H "Authorization: Bearer $NV_API_KEY" -H "Content-Type: application/json" -d '{"model":"meta/llama-3.3-70b-instruct","messages":[{"role":"user","content":"Hi"}]}' | jq -r '.choices[0].message.content'

# Cerebras — ultra-low latency
curl -s https://api.cerebras.ai/v1/chat/completions -H "Authorization: Bearer $CEREBRAS_API_KEY" -H "Content-Type: application/json" -d '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"Hi"}]}' | jq -r '.choices[0].message.content'

# A3M Proxy — auto-route to cheapest
curl http://localhost:8787/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hi"}]}'

# Preview routing decision
curl -X POST http://localhost:8787/v1/route -H "Content-Type: application/json" -d '{"query":"Hi"}'

# Health check
curl http://localhost:8787/health | jq '.status'
```

---

## Next Steps

- [Full API Reference](API.md)
- [Quick Start Guide](QUICK_START.md)
- [Configuration](CONFIGURATION.md)
- [RunKit Browser Demo](https://runkit.com/npm/adaptive-memory-multi-model-router)
