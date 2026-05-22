# GitHub Topics Update Script

Run this to update GitHub repository topics:

```bash
curl -X PATCH "https://api.github.com/repos/Das-rebel/adaptive-memory-multi-model-router" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": ["ai-agents", "ai-gateway", "ai-routing", "baichuan", "chinese-llm", "cost-optimization", "deepseek", "langchain", "llamaindex", "llm-gateway", "llm-router", "mcp", "minimax", "moonshot", "multi-llm", "openai-proxy", "proxy-server", "python", "qwen", "semantic-cache"],
    "description": "🔀 Open-source LLM router with 99.5% routing accuracy — auto-routes to cheapest capable model (Groq, DeepSeek, Kimi, Qwen + 36+ providers). Semantic cache, guardrails, 62% cost savings. 19.5KB, zero ML. TypeScript + Python SDK. MIT license."
  }'
```

Note: The topics and description are now properly optimized for discoverability.
