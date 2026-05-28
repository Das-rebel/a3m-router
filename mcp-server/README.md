# A3M Router MCP Server

MCP (Model Context Protocol) server for [A3M Router](https://github.com/Das-rebel/a3m-router) — parallel multi-LLM execution for AI agents.

Allows any MCP-compatible AI agent (Claude Code, Cursor, Windsurf, etc.) to use A3M's routing and ensemble execution directly.

## Tools

| Tool | Description |
|------|-------------|
| `a3m_route` | Route a query to the optimal LLM provider (model selection + reasoning, no execution) |
| `a3m_ensemble` | Execute a query across multiple providers in parallel and merge results |
| `a3m_classify` | Classify a query by type (fast/creative/deep/code) and get provider recommendations |
| `a3m_providers` | List all configured providers with models, cost, and availability |

## Installation

```bash
# Install globally
npm install -g @a3m/mcp-server

# Or from the repo
cd mcp-server
npm install
```

## Configuration

Set API keys as environment variables for the providers you want to use:

```bash
# Required for at least one provider
export GROQ_API_KEY=gsk_...
export GOOGLE_API_KEY=AIza...
export CEREBRAS_API_KEY=csk-...
export MISTRAL_API_KEY=...
export MINIMAX_API_KEY=...

# Optional: Custom A3M config
export A3M_CONFIG_PATH=~/.config/a3m-router/providers.json
```

## Usage

### Claude Code

Add to your `~/.claude.json` or project `.claude.json`:

```json
{
  "mcpServers": {
    "a3m-router": {
      "command": "npx",
      "args": ["@a3m/mcp-server"],
      "env": {
        "GROQ_API_KEY": "gsk_...",
        "GOOGLE_API_KEY": "AIza..."
      }
    }
  }
}
```

### Cursor

In Cursor Settings -> Features -> MCP Servers, add:

```
Name: A3M Router
Type: command
Command: npx @a3m/mcp-server
```

### Direct MCP Client

```bash
# Start the server
npx @a3m/mcp-server

# Pipe stdin/stdout for MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx @a3m/mcp-server
```

### Testing the Server

```bash
# Clone and install
git clone https://github.com/Das-rebel/a3m-router.git
cd a3m-router/mcp-server
npm install
npx tsc

# Run directly (pipe test)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Or use the MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Examples

### Route a query

```
Tool: a3m_route
Input: { "query": "Write a Python function to sort a list" }
Output:
{
  "model": "groq/llama-3.3-70b-versatile",
  "tier": "cheap",
  "provider": "groq",
  "confidence": 0.85,
  "reasoning": "Code query detected, routing to fast coding provider",
  "estimated_cost": 0.000012,
  "classification": "code"
}
```

### Ensemble execution

```
Tool: a3m_ensemble
Input: { "query": "Explain quantum computing in 3 sentences" }
Output:
{
  "query": "Explain quantum computing in 3 sentences",
  "parallel_responses": [
    { "provider": "groq", "confidence": 0.92, "content": "..." },
    { "provider": "google", "confidence": 0.88, "content": "..." },
    { "provider": "cerebras", "confidence": 0.85, "content": "..." }
  ],
  "best_answer": "...",
  "stats": {
    "total_providers": 4,
    "successful": 3,
    "failed": 1,
    "total_cost": 0.000031
  }
}
```

## Protocol

The server uses standard MCP transport via stdio:

```
Client -> Server: JSON-RPC request (stdin)
Server -> Client: JSON-RPC response (stdout)
Server -> Stderr: Logs (for debugging)
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│             MCP Client (Claude Code, Cursor)     │
└──────────────────┬──────────────────────────────┘
                   │ MCP Protocol (stdio)
┌──────────────────▼──────────────────────────────┐
│           A3M MCP Server (mcp-server)            │
│                                                   │
│  a3m_route   a3m_ensemble   a3m_classify  providers│
└──────────────────┬──────────────────────────────┘
                   │ Internal API
┌──────────────────▼──────────────────────────────┐
│        A3M Router (adaptive-memory-multi-        │
│           model-router)                          │
│                                                   │
│  routeQuery()  extractQueryFeatures()  providers  │
└───────┬────────────┬────────────┬────────────────┘
        │            │            │
   ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
   │  Groq  │  │ Google │  │Cerebras│  ...
   └────────┘  └────────┘  └────────┘
```

## Development

```bash
cd mcp-server
npm install
npm run build    # npx tsc
npm start        # node dist/index.js
```

## License

MIT
