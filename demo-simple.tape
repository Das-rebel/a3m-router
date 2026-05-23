# A3M Router VHS Demo - 90 Second Terminal Demo
# This version works without ttyd - outputs to GIF directly
# Target: 60-90 seconds

# =============================================================================
# SETUP - Works with just image output
# =============================================================================

Output a3m-demo.gif
Set FontSize 16
Set Width 1200
Set Height 675
Set TypingSpeed 30ms

# =============================================================================
# SCENE 1: THE PROBLEM (0-15s)
# =============================================================================

Type "#!/bin/bash"
Enter

Type "# Your LLM app today — costs $0.015 per request, no fallback"
Enter

Type "cat << 'EOF'"
Enter
Type "// Without A3M: you manage everything manually"
Enter
Type "const response = await openai.chat.completions.create({"
Enter
Type "  model: \"gpt-4o\",  // Always expensive"
Enter
Type "  messages: [{ role: \"user\", content: \"Explain quantum entanglement\" }]"
Enter
Type "});"
Enter
Type "// If OpenAI goes down → your app crashes"
Enter
Type "// You pay $0.015 per request forever"
Enter
Type "EOF"
Enter

Sleep 1s
Type "echo \"❌ Problem: $0.015/req, no fallback, manual management\""
Enter

Sleep 2s

# =============================================================================
# SCENE 2: WITH A3M - ONE LINE CHANGE (15-35s)
# =============================================================================

Ctrl+L

Type "# With A3M: one line change, infinite benefits"
Enter

Type "cat << 'EOF'"
Enter
Type "// Same request with A3M router"
Enter
Type "const response = await fetch(\"http://localhost:8787/v1/chat/completions\", {"
Enter
Type "  method: \"POST\","
Enter
Type "  headers: { \"Content-Type\": \"application/json\" },"
Enter
Type "  body: JSON.stringify({"
Enter
Type "    model: \"auto\",  // ← A3M picks the best model"
Enter
Type "    messages: [{ role: \"user\", content: \"Explain quantum entanglement\" }]"
Enter
Type "  })"
Enter
Type "});"
Enter
Type "EOF"
Enter

Sleep 1s

Type "# A3M analyzes and decides:"
Enter
Type "echo \"📊 Task: explanation → Complexity: simple → Budget: minimize\""
Enter
Type "echo \"✅ Routed to: Groq (FREE, 847ms)\""
Enter
Type "echo \"   Cost: $0.00 | Quality: 94%\""
Enter

Sleep 2s

# =============================================================================
# SCENE 3: FAILURE RECOVERY (35-55s)
# =============================================================================

Ctrl+L

Type "# A3M gracefully handles provider failures..."
Enter
Sleep 1s

Type "echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\""
Enter
Type "echo \"  [Groq] — Attempting connection...\""
Enter
Sleep 1s
Type "echo \"  [Groq] — ✗ FAILED — 503 Service Unavailable\""
Enter
Sleep 500ms
Type "echo \"  [Circuit Breaker] — Tripped after 3 failures\""
Enter
Sleep 500ms
Type "echo \"  [DeepSeek] — HEALTHY — Switching...\""
Enter
Sleep 1s
Type "echo \"\""
Enter
Type "echo \"✅ Response delivered via DeepSeek fallback\""
Enter
Type "echo \"   Your app: never knew there was a problem\""
Enter
Type "echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\""
Enter

Sleep 2s

# =============================================================================
# SCENE 4: COST SAVINGS (55-70s)
# =============================================================================

Ctrl+L

Type "# Same query. Dramatically different costs."
Enter

Type "echo \"\""
Enter
Type "echo \"  WITHOUT A3M          WITH A3M\""
Enter
Type "echo \"  ─────────────────    ────────────────\""
Enter
Type "echo \"  GPT-4o @ $3.00/1K     Groq @ $0.00/1K\""
Enter
Type "echo \"  500 tokens = $0.0015  500 tokens = $0.00\""
Enter
Sleep 1s
Type "echo \"\""
Enter
Type "echo \"💰 SAVINGS: 100% per query\""
Enter
Type "echo \"   At 1000 queries/day → $1.50 saved daily\""
Enter
Type "echo \"   At 1000 queries/day → $547 saved yearly\""
Enter

Sleep 2s

# =============================================================================
# SCENE 5: ONE COMMAND (70-90s)
# =============================================================================

Ctrl+L

Type "echo \"\""
Enter
Type "echo \"╔═══════════════════════════════════════════════════╗\""
Enter
Type "echo \"║         Get started in 10 seconds:                ║\""
Enter
Type "echo \"╚═══════════════════════════════════════════════════╝\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Type "echo \"  npm install -g adaptive-memory-multi-model-router\""
Enter
Sleep 300ms
Type "echo \"\""
Enter
Type "echo \"  # Auto-detects your API keys, zero config\""
Enter
Type "echo \"  npx a3m-router serve\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Type "echo \"  # Change: model: 'gpt-4o' → model: 'auto'\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Type "echo \"  GitHub: github.com/Das-rebel/adaptive-memory-multi-model-router\""
Enter
Type "echo \"  npm:    npmjs.com/package/adaptive-memory-multi-model-router\""
Enter
Sleep 1s
Type "echo \"\""
Enter
Type "echo \"✨ One prompt in. The right model out. ✨\""
Enter

Sleep 2s