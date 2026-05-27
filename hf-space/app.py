import gradio as gr
import json, time, os, httpx

# Sample responses for demo (no API keys needed)
DEMO_RESPONSES = {
    "hello": {
        "GPT-4o mini": "Hello! How can I help you today?",
        "Claude 3.5 Sonnet": "Hi there! I'm ready to assist you with any questions.",
        "Llama 3.3 70B": "Hey! What can I do for you today?",
    },
    "default": {
        "GPT-4o mini": "That's a great question! Here's what I know about it...",
        "Claude 3.5 Sonnet": "I'd be happy to help with that. Let me share some insights...",
        "Llama 3.3 70B": "Great question! Based on my knowledge, here's what I think...",
    }
}

def simulate_parallel(query):
    """Simulate parallel LLM execution with confidence scoring."""
    responses = DEMO_RESPONSES.get("default")
    if query.lower() in DEMO_RESPONSES:
        responses = DEMO_RESPONSES[query.lower()]
    
    results = []
    for provider, response in responses.items():
        # Simulate some delay per provider
        latency = round(0.1 + hash(query + provider) % 300 / 1000, 2)
        confidence = round(0.75 + hash(query + provider) % 20 / 100, 2)
        results.append({
            "provider": provider,
            "response": response,
            "latency": f"{latency}s",
            "confidence": confidence
        })
    
    # Sort by confidence
    results.sort(key=lambda x: x["confidence"], reverse=True)
    
    return results

def process_query(query):
    if not query.strip():
        return "Please enter a query.", "", ""
    
    start = time.time()
    results = simulate_parallel(query)
    elapsed = time.time() - start
    
    # Format results
    table = "| Provider | Response | Latency | Confidence |\n|----------|----------|---------|------------|\n"
    for r in results:
        table += f"| {r['provider']} | {r['response'][:50]}... | {r['latency']} | {r['confidence']} |\n"
    
    winner = results[0]
    summary = f"🏆 **Winner: {winner['provider']}** (confidence: {winner['confidence']})\n\nTotal time: {elapsed:.2f}s | Providers: {len(results)} in parallel\n\n**Best response:** {winner['response']}"
    
    return table, summary, json.dumps(results, indent=2)

with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🔀 A3M Router — Parallel LLM Demo")
    gr.Markdown("See how A3M Router runs multiple providers **in parallel** and picks the best response by confidence scoring.")
    
    with gr.Row():
        query = gr.Textbox(label="Your Query", placeholder="Enter a question...", scale=3)
        submit = gr.Button("🚀 Execute", variant="primary", scale=1)
    
    with gr.Row():
        with gr.Column():
            gr.Markdown("### 📊 Results Table")
            results_table = gr.Dataframe(
                headers=["Provider", "Response", "Latency", "Confidence"],
                label="Parallel Results"
            )
        with gr.Column():
            gr.Markdown("### 🏆 Best Result")
            best_result = gr.Markdown()
    
    with gr.Row():
        with gr.Accordion("Raw JSON Output", open=False):
            raw_output = gr.JSON()
    
    gr.Markdown("---\n### ⚡ In production, A3M Router runs on 47+ providers with real API calls")
    gr.Markdown("[📖 GitHub](https://github.com/Das-rebel/a3m-router) | [📦 npm](https://www.npmjs.com/package/adaptive-memory-multi-model-router) | 19.5 KB | Zero ML | MIT")
    
    submit.click(
        fn=process_query,
        inputs=query,
        outputs=[results_table, best_result, raw_output]
    )
    
    gr.Examples(
        examples=[["Hello, how are you?"], ["What is machine learning?"], ["Explain quantum computing"]],
        inputs=query
    )

if __name__ == "__main__":
    demo.launch()
