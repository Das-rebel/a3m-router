# TMLPD PI Extension - Usage Examples

## Quick Start

```python
from tmlpd import quick_process

# One-liner
result = quick_process("What is quantum entanglement?")
print(result["content"])
```

## Task Classification

```python
from tmlpd import TMLPDLite, TaskType

lite = TMLPDLite()

# Automatic task classification
prompt = "Write Python async HTTP client"
task_type = lite.classify_task(prompt)  # TaskType.CODING

# Get optimal models
models = lite.get_optimal_models(task_type, 3)
# ["codex", "claude-minimax", "claude"]
```

## Caching

```python
from tmlpd import TMLPDLite

lite = TMLPDLite()

# First call - not cached
result1 = lite.process("What is 2+2?", use_cache=True)
print(f"Cached: {result1['cached']}")  # False

# Second call - from cache
result2 = lite.process("What is 2+2?", use_cache=True)
print(f"Cached: {result2['cached']}")  # True
```

## Async Client (Production)

```python
import asyncio
from tmlpd import TMLPDClient, TMLPDConfig

async def main():
    config = TMLPDConfig(
        cache_ttl_seconds=3600,
        daily_budget=10.0,
        max_concurrent=5
    )
    client = TMLPDClient(config)
    
    # Single execution
    result = await client.execute("Explain quantum entanglement")
    
    # Parallel execution
    parallel = await client.execute_parallel(
        "Compare Python and JavaScript",
        models=["gpt-4o", "claude", "gemini"]
    )
    
    # Cost summary
    summary = await client.get_cost_summary()
    print(f"Total spent: ${summary.total_cost}")

asyncio.run(main())
```

## Cost Optimization

```python
import asyncio
from tmlpd import TMLPDClient

async def cost_optimization():
    client = TMLPDClient()
    
    # Cheap for simple tasks
    simple = await client.execute("What is 2+2?", model="cerebras/llama-3.3-70b")
    print(f"Simple task cost: ${simple.cost:.6f}")
    
    # Premium for complex tasks
    complex = await client.execute("Design microservices", model="anthropic/claude-3.5-sonnet")
    print(f"Complex task cost: ${complex.cost:.6f}")

asyncio.run(cost_optimization())
```

## LangChain Integration

```python
from langchain.llms import BaseLLM
from tmlpd import TMLPDLite

class TMLPDLLM(BaseLLM):
    def __init__(self, task_type="default"):
        self.lite = TMLPDLite()
        self.task_type = task_type
    
    def _call(self, prompt: str) -> str:
        result = self.lite.process(prompt)
        return result["content"]

# Usage
llm = TMLPDLLM(task_type="coding")
response = llm("Write a Python function")
```

## API Server

```python
# Run: node node_modules/tmlpd-pi/dist/server.js --port 18791
# Then use Python client:

import httpx

async def api_example():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:18791/execute",
            json={"prompt": "Hello world", "models": ["gpt-4o"]}
        )
        print(response.json())
```

## Task Types

| Task Type | Keywords | Best Models |
|-----------|----------|-------------|
| coding | python, javascript, code | codex, claude-minimax |
| frontend | react, vue, component | codex, claude-minimax |
| backend | api, server, database | codex, claude-glm |
| chinese | 中文, 汉语 | claude-glm, claude-minimax |
| fast | quick, simple | gemini, claude-haiku |
| premium | advanced, complex | claude-opus, gemini-pro |

## Environment Variables

```bash
# API Keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROQ_API_KEY="gsk_..."

# TMLPD Configuration
export TMLPD_MAX_CONCURRENT=5
export TMLPD_DAILY_BUDGET=10.0
export TMLPD_CACHE_TTL=3600
```

## Full Example

```python
import asyncio
from tmlpd import TMLPDClient, TMLPDLite

async def full_example():
    # Lite for quick tasks
    lite = TMLPDLite()
    result = lite.process("What is Python?", use_cache=True)
    print(f"Lite: {result['task_type']}")
    
    # Full client for production
    client = TMLPDClient()
    
    # Batch processing
    prompts = ["What is AI?", "What is ML?", "What is DL?"]
    for prompt in prompts:
        result = await client.execute(prompt)
        print(f"Cost: ${result.cost:.6f}")
    
    # Final stats
    summary = await client.get_cost_summary()
    print(f"Total: ${summary.total_cost:.6f}")

asyncio.run(full_example())
```