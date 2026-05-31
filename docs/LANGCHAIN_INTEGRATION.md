# LangChain Provider Integration for A3M Router

This document outlines how to integrate A3M Router with LangChain as a custom LLM provider.

## Option 1: OpenAI-Compatible API (Recommended)

A3M Router is OpenAI-compatible, so you can use it with LangChain's OpenAI integration:

```python
from langchain_openai import OpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

# Configure A3M Router as OpenAI-compatible endpoint
llm = OpenAI(
    model="auto",  # A3M will route automatically
    openai_api_base="http://localhost:8787/v1",  # A3M Router
    openai_api_key="your-api-key",  # Required by A3M but not used for routing
)

# Simple usage
chain = LLMChain(
    llm=llm,
    prompt=PromptTemplate.from_template("Explain {topic} in {style}.")
)

result = chain.run(topic="quantum computing", style="a haiku")
print(result)
```

## Option 2: Custom LangChain Callback Integration

For more control over routing decisions:

```python
from langchain.callbacks.base import BaseCallbackHandler
from langchain_openai import OpenAI
from typing import Any, Dict, List
import requests

class A3MRouterCallback(BaseCallbackHandler):
    """Callback that logs A3M routing decisions"""
    
    def __init__(self):
        self.routing_history = []
    
    def on_llm_start(self, serialized: Dict, prompts: List[str], **kwargs):
        query = prompts[0] if prompts else ""
        # Get routing decision before LLM call
        response = requests.post(
            "http://localhost:8787/v1/route",
            json={"query": query}
        )
        if response.ok:
            decision = response.json()
            self.routing_history.append(decision)
            print(f"🔀 Routed to: {decision.get('model')} "
                  f"(${decision.get('cost')})")

# Use with LangChain
llm = OpenAI(
    model="auto",
    openai_api_base="http://localhost:8787/v1",
    callbacks=[A3MRouterCallback()]
)
```

## Option 3: A3M Router as LangChain Tool

Use A3M's routing as a tool in LangChain agents:

```python
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from langchain_openai import OpenAI
import requests

def get_routing_decision(query: str) -> str:
    """Get A3M routing decision for a query"""
    response = requests.post(
        "http://localhost:8787/v1/route",
        json={"query": query}
    )
    if response.ok:
        data = response.json()
        return f"Model: {data.get('model')}, Tier: {data.get('tier')}, Cost: ${data.get('cost')}"
    return "Error: A3M Router not available"

routing_tool = Tool(
    name="A3M Router",
    func=get_routing_decision,
    description="Useful for determining the best LLM for a task"
)

# Create agent with routing tool
llm = OpenAI(temperature=0)
agent = initialize_agent(
    tools=[routing_tool],
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

agent.run("What model should I use for a Python debugging task?")
```

## Installation

```bash
pip install langchain langchain-openai requests
```

## Environment Setup

```bash
export OPENAI_API_KEY="your-key"  # Required for LangChain
# A3M Router runs separately at localhost:8787
```

## A3M Router + LangChain Flow

```
User Query → LangChain Agent → A3M Router (/v1/route)
                              ↓
                         Optimal Model Selected
                              ↓
                    Provider API (Groq, DeepSeek, etc.)
                              ↓
                         Response Returned
```

## Cost Tracking

A3M Router automatically tracks costs. In LangChain:

```python
from langchain.callbacks import get_openai_callback

with get_openai_callback() as cb:
    chain.run("Explain quantum computing")
    print(f"Total tokens: {cb.total_tokens}")
    print(f"Total cost: ${cb.total_cost}")
```

---

For more info: https://github.com/Das-rebel/a3m-router
