# A3M Router VHS Demo - 90 Second Terminal Demo
# Target: 60-90 seconds
# Output: a3m-demo.gif

# =============================================================================
# SETUP
# =============================================================================

Output demo.gif
Set FontSize 16
Set Width 1200
Set Height 675
Set TypingSpeed 30ms
Set Shell bash
Set FontFamily "JetBrains Mono"

# Theme - dark terminal
Set ThemeFlavor catppuccin-mocha

# =============================================================================
# SCENE 1: THE PROBLEM (0-15s)
# =============================================================================

Type "#!/bin/bash"
Enter

Sleep 500ms

Type "# Your LLM app today — costs $0.015 per request, no fallback"
Enter

Type "cat << 'EOF'"
Enter
Sleep 100ms
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

# Red X marks
Type "echo \"❌ Problem: $0.015/req, no fallback, manual management\""
Enter

Sleep 2s

# =============================================================================
# SCENE 2: WITH A3M - ONE LINE CHANGE (15-35s)
# =============================================================================

Ctrl+L
Sleep 500ms

Type "# With A3M: one line change, infinite benefits"
Enter

Type "cat << 'EOF'"
Enter
Sleep 100ms
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

# Show routing decision
Enter
Type "# A3M analyzes and decides:"
Enter
Sleep 200ms
Type "echo \"📊 Task: explanation → Complexity: simple → Budget: minimize\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"✅ Routed to: Groq (FREE, 847ms)\""
Enter
Sleep 500ms
Type "echo \"   Cost: $0.00 | Quality: 94%\""
Enter

Sleep 2s

# =============================================================================
# SCENE 3: FAILURE RECOVERY (35-55s)
# =============================================================================

Ctrl+L
Sleep 500ms

Type "# But what happens when a provider fails?"
Enter
Sleep 1s

Type "# A3M gracefully handles failures..."
Enter

Sleep 1s

# Simulate the failure scenario
Type "echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\""
Enter
Sleep 300ms
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
Sleep 300ms
Type "echo \"✅ Response delivered via DeepSeek fallback\""
Enter
Sleep 500ms
Type "echo \"   Your app: never knew there was a problem\""
Enter
Sleep 500ms
Type "echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\""
Enter

Sleep 2s

# =============================================================================
# SCENE 4: COST SAVINGS (55-70s)
# =============================================================================

Ctrl+L
Sleep 500ms

Type "# Same query. Dramatically different costs."
Enter
Sleep 500ms

Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"  WITHOUT A3M          WITH A3M\""
Enter
Sleep 200ms
Type "echo \"  ─────────────────    ────────────────\""
Enter
Sleep 200ms
Type "echo \"  GPT-4o @ $3.00/1K     Groq @ $0.00/1K\""
Enter
Sleep 200ms
Type "echo \"  500 tokens = $0.0015  500 tokens = $0.00\""
Enter
Sleep 1s
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"💰 SAVINGS: 100% per query\""
Enter
Sleep 300ms
Type "echo \"   At 1000 queries/day → $1.50 saved daily\""
Enter
Sleep 300ms
Type "echo \"   At 1000 queries/day → $547 saved yearly\""
Enter

Sleep 2s

# =============================================================================
# SCENE 5: ONE COMMAND (70-90s)
# =============================================================================

Ctrl+L
Sleep 500ms

Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"╔═══════════════════════════════════════════════════╗\""
Enter
Sleep 100ms
Type "echo \"║         Get started in 10 seconds:                ║\""
Enter
Sleep 100ms
Type "echo \"╚═══════════════════════════════════════════════════╝\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"  npm install -g adaptive-memory-multi-model-router\""
Enter
Sleep 300ms
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"  # Auto-detects your API keys, zero config\""
Enter
Sleep 300ms
Type "echo \"  npx a3m-router serve\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"  # Change: model: 'gpt-4o' → model: 'auto'\""
Enter
Sleep 500ms
Type "echo \"\""
Enter
Sleep 300ms
Type "echo \"  GitHub: github.com/Das-rebel/adaptive-memory-multi-model-router\""
Enter
Sleep 200ms
Type "echo \"  npm:    npmjs.com/package/adaptive-memory-multi-model-router\""
Enter

Sleep 2s

# Final pulse effect
Type "echo \"\""
Enter
Sleep 200ms
Type "echo \"✨ One prompt in. The right model out. ✨\""
Enter

Sleep 1s