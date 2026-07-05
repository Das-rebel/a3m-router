import gradio as gr
import json
import time

# Simulated routing decisions (in production, use actual A3M Router API)
ROUTING_RULES = {
    "greeting": {"model": "groq/llama-3.3-70b", "tier": "free", "cost": 0.00001},
    "code": {"model": "groq/llama-3.3-70b", "tier": "cheap", "cost": 0.0004},
    "math": {"model": "deepseek/deepseek-chat", "tier": "cheap", "cost": 0.0003},
    "creative": {"model": "anthropic/claude-3-haiku", "tier": "mid", "cost": 0.001},
    "reasoning": {"model": "openai/gpt-4o-mini", "tier": "mid", "cost": 0.0015},
    "default": {"model": "groq/llama-3.3-70b", "tier": "cheap", "cost": 0.0004}
}

def route_query(query):
    """Route a query to the optimal provider"""
    query_lower = query.lower()
    
    # Simple keyword matching
    if any(word in query_lower for word in ["hi", "hello", "hey", "thanks"]):
        result = ROUTING_RULES["greeting"]
        reasoning = "Simple greeting detected → free tier"
    elif any(word in query_lower for word in ["code", "python", "javascript", "function", "bug"]):
        result = ROUTING_RULES["code"]
        reasoning = "Coding task detected → cheap tier (Groq)"
    elif any(word in query_lower for word in ["math", "calculate", "equation", "solve for"]):
        result = ROUTING_RULES["math"]
        reasoning = "Mathematical query → cheap tier (DeepSeek)"
    elif any(word in query_lower for word in ["write", "story", "poem", "creative"]):
        result = ROUTING_RULES["creative"]
        reasoning = "Creative task → mid tier (Claude Haiku)"
    elif any(word in query_lower for word in ["explain", "why", "how", "what is"]):
        result = ROUTING_RULES["reasoning"]
        reasoning = "Explanation needed → mid tier (GPT-4o mini)"
    else:
        result = ROUTING_RULES["default"]
        reasoning = "General query → cheap tier (Groq)"
    
    # Simulate routing time
    routing_time = round(time.time() % 1 * 10, 2)  # 0-10ms simulated
    
    return {
        "model": result["model"],
        "tier": result["tier"],
        "estimated_cost": f"${result['cost']:.6f}",
        "routing_time_ms": routing_time,
        "reasoning": reasoning
    }

def explain_routing():
    """Return explanation of A3M Router"""
    return """
## How A3M Router Works

### 12 Keyword Signals
A3M analyzes queries across 5 dimensions:
1. **Domain**: coding, math, creative, factual
2. **Complexity**: simple, medium, hard  
3. **Intent**: debug, explain, create, compare
4. **Length**: short, medium, long
5. **Structure**: structured, unstructured

### Provider Tiers
| Tier | Providers | Cost/1K |
|------|-----------|----------|
| Free | Groq, Together | $0 |
| Cheap | Mistral, DeepSeek | $0.001-0.01 |
| Mid | Claude Haiku, GPT-4o mini | $0.01-0.05 |
| Premium | GPT-4o, Claude 3.5 | $0.50+ |

### Benchmark Results
- **RouterArena Score**: 96.77% (#1 of 19 routers)
- **Cost/1K queries**: $0.0768
- **vs GPT-5**: 130× cheaper
"""

# Examples for Gradio
EXAMPLES = [
    ["Hi, how are you?"],
    ["Write a Python function to sort a list"],
    ["Explain quantum entanglement"],
    ["Solve for x: 2x + 5 = 15"],
    ["Write a haiku about coding"],
]

# Build Gradio interface
with gr.Blocks(title="A3M Router Demo", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🎯 A3M Router Demo")
    gr.Markdown("### #1 LLM Routing Benchmark — $0.0768/1K — 130× cheaper than GPT-5")
    
    with gr.Row():
        with gr.Column(scale=2):
            query_input = gr.Textbox(
                label="Enter your query",
                placeholder="e.g., Explain machine learning...",
                lines=3
            )
            route_btn = gr.Button("Route Query", variant="primary")
            
        with gr.Column(scale=1):
            output_info = gr.JSON(label="Routing Decision")
    
    gr.Examples(EXAMPLES, inputs=[query_input], label="Try these examples")
    
    route_btn.click(
        fn=route_query,
        inputs=[query_input],
        outputs=[output_info]
    )
    
    query_input.submit(
        fn=route_query,
        inputs=[query_input],
        outputs=[output_info]
    )
    
    gr.Markdown(explain_routing())
    
    gr.Markdown("""
---
📚 **Learn more**: [GitHub](https://github.com/Das-rebel/a3m-router) | 
[npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router) |
[RouterArena](https://arxiv.org/abs/2510.00202)
""")

demo.launch()
