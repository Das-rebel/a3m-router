# A3M Router — Hacker News Demo (60 seconds)
# Output: GIF for README + HN post
# Tools: VHS (github.com/charmbracelet/vhs)
# Usage: vhs demo/demo-hn.tape
# Result: assets/demo-hn.gif

Output assets/demo-hn.gif
Require echo
Require npx

Set Shell "bash"
Set FontSize 14
Set FontFamily "JetBrains Mono"
Set Width 900
Set Height 500
Set Padding 20
Set MarginFill "#0d1117"
Set BorderRadius 12
Set WindowBar Colorful
Set WindowBarSize 40
Set TypingSpeed 40ms
Set PlaybackSpeed 1.2
Set Framerate 30
Set Theme "{ \"background\": \"#0d1117\", \"foreground\": \"#e6edf3\", \"cursor\": \"#58a6ff\", \"selectionBackground\": \"#264f78\", \"selectionForeground\": \"#e6edf3\", \"black\": \"#484f58\", \"red\": \"#ff7b72\", \"green\": \"#3fb950\", \"yellow\": \"#d29922\", \"blue\": \"#58a6ff\", \"magenta\": \"#bc8cff\", \"cyan\": \"#39d353\", \"white\": \"#b1bac4\" }"

# =================================================================
# SCENE 1: Install (0-8s)
# =================================================================
Type "npm install adaptive-memory-multi-model-router"
Enter
Sleep 3s

# =================================================================
# SCENE 2: Route a simple query (8-22s)
# =================================================================
Type "npx a3m-router route \"What is 2+2?\""
Enter
Sleep 4s

# Show the output lines (simulated — real output will be shown by the command)
# The router will display:
#   → Query: "What is 2+2?"
#   → Complexity: 8/100 (TRIVIAL)
#   → Routed to: groq/llama-3.3-70b
#   → Cost: $0.000009
#   → Response: "2+2 equals 4"

# =================================================================
# SCENE 3: Route a code query (22-35s)
# =================================================================
Sleep 1s
Type "npx a3m-router route \"Write Python to sort an array\""
Enter
Sleep 4s

# The router will display:
#   → Query: "Write Python to sort an array"
#   → Complexity: 35/100 (MODERATE)
#   → Routed to: groq/llama-3.3-70b
#   → Cost: $0.0004
#   → Response: def sort_array(arr): ...

# =================================================================
# SCENE 4: Show providers (35-45s)
# =================================================================
Sleep 1s
Type "npx a3m-router providers"
Enter
Sleep 3s

# Shows table of 40+ providers with status, latency, cost

# =================================================================
# SCENE 5: Start proxy (45-55s)
# =================================================================
Sleep 1s
Type "npx a3m-router serve"
Enter
Sleep 3s

# Shows:
#   A3M Router proxy running on http://localhost:8787
#   Compatible with OpenAI SDK
#   40 providers configured

# =================================================================
# SCENE 6: End card (55-60s)
# =================================================================
Sleep 1s
Ctrl+C
Sleep 500ms

Type "echo 'STAR ⭐ github.com/Das-rebel/a3m-router'"
Enter
Sleep 2s