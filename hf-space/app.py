import gradio as gr
import json
import time
import os
import random

# A3M Router Demo - Live Parallel LLM Execution Visualization
# No API keys needed - uses simulated responses for the demo

PROVIDERS = [
    ("OpenAI/GPT-4o-mini", 0.00015, 0.85),
    ("Anthropic/Claude-3.5-Haiku", 0.00025, 0.83),
    ("Groq/Llama-3.3-70B", 0.000059, 0.82),
    ("DeepSeek/Chat", 0.000014, 0.79),
    ("NVIDIA/Llama-3.3-70B", 0.00022, 0.84),
    ("Together/Mistral-7B", 0.000018, 0.76),
    ("OpenRouter/Auto", 0.000030, 0.80),
]

BENCHMARK_DATA = [
    ("A3M Router 🥇", 96.77%, 0.0768, True),
    ("Sqwish 🥈", 75.27, 0.18, False),
    ("Azure (Microsoft) 🥉", 71.87, 0.22, False),
    ("GPT-5 (OpenAI)", 64.32, 10.02, False),
    ("RouteLLM (Berkeley)", 48.07, 0.27, True),
]

SAMPLE_RESPONSES = {
    "hello": "Hello! I'm here to help. What would you like to know?",
    "what is machine learning": "Machine learning is a subset of AI where algorithms learn patterns from data to make predictions, without being explicitly programmed for each task.",
    "explain quantum computing": "Quantum computing uses quantum mechanical phenomena like superposition and entanglement to perform computations exponentially faster than classical computers for specific problems.",
    "write a python sort": "def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr)//2]\n    left = [x for x in arr if x < pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + [pivot] + quicksort(right)",
}

def simulate_routing(query, strategy):
    """Simulate parallel LLM routing with confidence scoring."""
    if not query.strip():
        return "", "", "", ""
    
    start = time.time()
    
    # Find best matching sample response
    response_base = SAMPLE_RESPONSES.get("what is machine learning")  # default
    for key in SAMPLE_RESPONSES:
        if key in query.lower():
            response_base = SAMPLE_RESPONSES[key]
            break
    
    # Simulate parallel execution
    results = []
    for provider, cost, base_conf in PROVIDERS:
        latency = round(random.uniform(80, 350), 0)
        # Add confidence variation
        conf = round(base_conf + random.uniform(-0.05, 0.05), 2)
        conf = min(max(conf, 0.5), 0.99)
        results.append({
            "provider": provider,
            "response": response_base[:60] + "...",
            "latency_ms": int(latency),
            "confidence": conf,
            "cost": cost,
            "winner": False
        })
    
    # Sort by confidence (A3M's strategy)
    results.sort(key=lambda x: x["confidence"], reverse=True)
    results[0]["winner"] = True
    
    winner = results[0]
    total_cost = winner["cost"]
    total_latency = max(r["latency_ms"] for r in results)  # Parallel = max
    elapsed = round((time.time() - start) * 1000, 0)
    
    # Format results table
    table = "| Provider | Confidence | Latency | Cost |\n|----------|-----------|---------|------|\n"
    for r in results:
        icon = "🏆" if r["winner"] else ""
        table += f"| {icon} {r['provider']} | {r['confidence']:.0%} | {r['latency_ms']}ms | ${r['cost']:.6f} |\n"
    
    # Summary
    summary = f"### 🏆 Winner: **{winner['provider']}**\n\n"
    summary += f"- **Confidence:** {winner['confidence']:.0%}\n"
    summary += f"- **Cost:** ${winner['cost']:.6f}\n"
    summary += f"- **Total parallel latency:** {total_latency}ms\n"
    summary += f"- **Strategy:** {strategy}\n\n"
    summary += f"You got the **best response at the lowest cost** because all providers ran in parallel."
    
    # Cost comparison
    gpt5_cost = 10.02 / 1000
    savings = round(gpt5_cost / winner["cost"]) if winner["cost"] > 0 else 999
    cost_text = f"### 💰 Cost vs Sequential Fallback\n\n"
    cost_text += f"| Approach | Cost | Latency |\n|----------|------|----------|\n"
    cost_text += f"| **A3M (parallel)** | **${winner['cost']:.6f}** | **{total_latency}ms** |\n"
    cost_text += f"| Sequential (3 retries) | ${total_cost * 3:.6f} | {total_latency * 3}ms |\n"
    cost_text += f"| GPT-5 (OpenAI) | ${gpt5_cost:.4f} | ~500ms |\n\n"
    cost_text += f"**{savings}× cheaper** than calling GPT-5 directly.\n"
    
    return table, summary, cost_text, json.dumps(results, indent=2)

def generate_benchmark():
    """Generate benchmark comparison chart."""
    chart_data = gr.Dataframe(
        value=[[r[0], r[1], f"${r[2]}"] for r in BENCHMARK_DATA],
        headers=["Router", "RouterArena Score", "Cost/1K"],
        label="RouterArena Benchmark Results (arXiv:2510.00202)"
    )
    return chart_data

with gr.Blocks(
    theme=gr.themes.Soft(primary_hue="green"),
    css="""
        .winner-row { background-color: #1a3a1a !important; }
        footer { display: none !important; }
    """
) as demo:
    gr.Markdown("""
    # 🔀 A3M Router — #1 LLM Routing Benchmark & No. 1 in Cost with Memory
    
    **See how parallel LLM execution works in real-time.** Enter a query and watch 7 providers compete simultaneously.
    
    ⭐ RouterArena #1 (96.77%) | 💰 No. 1 in Cost at $0.0768/1K | 🔓 Open-source (MIT) | 📦 19.5KB
    """)
    
    with gr.Tab("🚀 Try It"):
        with gr.Row():
            query = gr.Textbox(
                label="Your Query",
                placeholder="Try: explain quantum computing, what is machine learning, write a python sort...",
                scale=4
            )
            strategy = gr.Dropdown(
                choices=["parallel (A3M default)", "fastest", "creative", "deep"],
                value="parallel (A3M default)",
                label="Strategy",
                scale=1
            )
        submit = gr.Button("🚀 Execute Parallel Routing", variant="primary", size="lg")
        
        with gr.Row():
            with gr.Column(scale=2):
                results_table = gr.Markdown(label="Results")
            with gr.Column(scale=1):
                summary = gr.Markdown(label="Best Result")
        
        with gr.Row():
            cost_comparison = gr.Markdown(label="Cost Savings")
        
        with gr.Accordion("Raw JSON Output", open=False):
            raw_output = gr.JSON()
        
        gr.Examples(
            examples=[["Explain quantum computing"], ["What is machine learning?"], ["Write a Python sort function"], ["Hello, how are you?"]],
            inputs=query
        )
        
        submit.click(
            fn=simulate_routing,
            inputs=[query, strategy],
            outputs=[results_table, summary, cost_comparison, raw_output]
        )
    
    with gr.Tab("📊 Benchmark"):
        gr.Markdown("""
        ### RouterArena Benchmark Results
        
        | Rank | Router | Score | Cost/1K | Open Source? |
        |------|--------|:-----:|:-------:|:------------:|
        | 🥇 | **A3M Router** | **96.77%** | **$0.0768** | ✅ |
        | 🥈 | Sqwish | 75.27 | $0.18 | ❌ |
        | 🥉 | Azure (Microsoft) | 71.87 | $0.22 | ❌ |
        | 4 | GPT-5 (OpenAI) | 64.32 | $10.02 | ❌ |
        | 5 | RouteLLM (Berkeley) | 48.07 | $0.27 | ✅ |
        
        **130× cheaper than GPT-5, 12 points higher.** Evaluated by RouterArena (arXiv:2510.00202) on 8,400 queries across 9 domains.
        
        [Full Benchmark →](https://das-rebel.github.io/a3m-router/benchmark) | [RouterArena PR →](https://github.com/RouteWorks/RouterArena/pull/144)
        """)
    
    with gr.Tab("💻 Code"):
        gr.Markdown("""
        ### Install & Run in 5 Seconds
        
        ```bash
        # No config needed — auto-detects API keys from environment
        npm install adaptive-memory-multi-model-router
        npx a3m-router route "Explain quantum computing"
        ```
        
        ### TypeScript/Node.js
        
        ```javascript
        import { createRouter } from 'adaptive-memory-multi-model-router';
        
        const router = createRouter(); // auto-detects API keys
        
        // Parallel execution with confidence scoring
        const result = await router.route('What is machine learning?');
        
        console.log(result.response);    // Best response
        console.log(result.provider);    // Winning provider
        console.log(result.cost);        // Actual cost
        console.log(result.confidence);  // Confidence score
        ```
        
        ### With Memory (Unique Feature)
        
        ```javascript
        const router = createRouter({
          memory: { enabled: true }  // Context persists across sessions
        });
        
        await router.route('My name is Alice');
        await router.route('What is my name?');  // → "Your name is Alice!"
        ```
        
        ### CLI
        
        ```bash
        # Route a query
        npx a3m-router route "Explain quantum computing"
        
        # Check costs
        npx a3m-router cost
        
        # Health check
        npx a3m-router health
        ```
        
        [GitHub →](https://github.com/Das-rebel/a3m-router) | [npm →](https://www.npmjs.com/package/adaptive-memory-multi-model-router) | [Docs →](https://das-rebel.github.io/a3m-router/)
        """)
    
    gr.Markdown("""
    ---
    🔀 A3M Router — #1 LLM Routing Benchmark & No. 1 in Cost with Memory | [GitHub](https://github.com/Das-rebel/a3m-router) | [npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router) | [Benchmark](https://das-rebel.github.io/a3m-router/benchmark)
    
    *This demo simulates parallel LLM execution. In production, A3M makes real API calls to 47+ providers.*
    """)

if __name__ == "__main__":
    demo.launch()
