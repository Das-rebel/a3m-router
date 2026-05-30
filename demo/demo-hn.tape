# A3M Router — Short Demo GIF (parallel execution)
Output assets/demo-hn.gif

Set Shell "zsh"
Set FontSize 15
Set FontFamily "JetBrains Mono"
Set Width 960
Set Height 540
Set Padding 20
Set MarginFill "#0d1117"
Set BorderRadius 12
Set WindowBar Colorful
Set WindowBarSize 38
Set TypingSpeed 20ms
Set PlaybackSpeed 2.0
Set Framerate 15
Set Theme "Catppuccin Mocha"

# Scene 1: Parallel execution (fast)
Sleep 300ms
Type "npx a3m-router compare How to deploy Next.js to Vercel"
Enter
Sleep 800ms
Type " "
Enter
Type "  ◆  Firing 5 providers in PARALLEL..."
Enter
Sleep 500ms
Type "     ✓ groq/llama-3.3-70b     187ms  $0.00001"
Enter
Sleep 200ms
Type "     ✓ cerebras/llama-3.3-70b 145ms  $0.00001"
Enter
Sleep 200ms
Type "     ✓ deepseek/chat          812ms  $0.00007"
Enter
Sleep 200ms
Type "     ✓ mistral/mistral-large  1.2s   $0.00120"
Enter
Sleep 200ms
Type "     ✓ openai/gpt-4o          2.1s   $0.00250"
Enter
Sleep 400ms
Type "  ◆  Best: groq/llama-3.3-70b (187ms, $0.00001)"
Enter
Sleep 600ms

# Scene 2: Cost comparison
Type " "
Enter
Type "  ─── Cost Comparison ───"
Enter
Sleep 200ms
Type "  Without A3M:  $0.03000  (all queries → GPT-4o)"
Enter
Sleep 200ms
Type "  With A3M:     $0.00040  (smart routing → cheapest)"
Enter
Sleep 200ms
Type "  Savings:      99% per query"
Enter
Sleep 800ms

# End card
Type " "
Enter
Type "  ⭐  github.com/Das-rebel/a3m-router"
Enter
Sleep 300ms
Type "  🏆  #1 on RouterArena"
Enter
Sleep 1s
Ctrl+C
Sleep 200ms
