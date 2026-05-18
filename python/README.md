# A3M Router Python SDK

Python SDK for the A3M Router — an intelligent LLM routing proxy that selects the best model for each query based on complexity, cost, and capability.

## Install

```bash
pip install a3m-router
```

Requires Python 3.8+. Only dependency: `httpx`.

## Quick Start

### Async Client (recommended)

```python
import asyncio
from a3m import A3MRouter

async def main():
    async with A3MRouter() as router:
        # Chat with automatic model routing
        response = await router.chat("What is 2+2?")
        print(response["choices"][0]["message"]["content"])

        # Check routing decision without executing
        decision = await router.route("Write a Python web scraper")
        print(decision)  # RoutingDecision(model=groq/llama-3.3-70b, tier=cheap, cost=$0.000000, complexity=0.35)

        # Stream a response
        async for token in router.stream_chat("Tell me a joke"):
            print(token, end="", flush=True)

        # List available models
        models = await router.models()

        # Get cost analytics
        report = await router.cost_report()
        print(f"Total requests: {report.total_requests}")
        print(f"Savings: {report.savings_percentage:.1f}%")

asyncio.run(main())
```

### Sync Client

```python
from a3m.sync_client import A3MRouterSync

with A3MRouterSync() as router:
    response = router.chat("What is 2+2?")
    print(response["choices"][0]["message"]["content"])

    decision = router.route("Explain quantum computing")
    print(f"Routed to {decision.model} (tier={decision.tier}, cost=${decision.cost:.6f})")
```

### With OpenAI SDK

The router is OpenAI-compatible, so you can use the standard OpenAI SDK:

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(base_url="http://localhost:8787/v1", api_key="not-needed")
response = await client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## API Reference

### A3MRouter (async)

| Method | Description |
|--------|-------------|
| `chat(message, model="auto", max_tokens=100, temperature=0.7, system=None)` | Send a chat message with automatic routing |
| `route(query)` | Get routing decision without executing |
| `route_batch(queries)` | Route multiple queries |
| `stream_chat(message, model="auto", max_tokens=100)` | Stream response tokens |
| `models()` | List available models |
| `health()` | Check router health |
| `cost_report()` | Get cost analytics |

### RoutingDecision

| Field | Type | Description |
|-------|------|-------------|
| `model` | str | Selected model name |
| `tier` | str | Cost tier (free/cheap/mid/premium) |
| `cost` | float | Estimated cost per request |
| `complexity` | float | Query complexity score (0-1) |
| `reasoning` | str | Why this model was chosen |
| `fallback_models` | list | Alternative models if primary fails |
| `is_free` | bool | Property — True if cost is $0 |
| `is_expert` | bool | Property — True if complexity >= 0.65 |

## License

MIT
