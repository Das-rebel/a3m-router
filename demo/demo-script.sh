#!/bin/bash
# A3M Router Demo Script for asciinema recording
# Run: asciinema rec -c "bash demo/demo-script.sh"

echo "╔══════════════════════════════════════════╗"
echo "║     A3M Router - Quick Demo             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

echo "📦 Installing..."
sleep 1
echo "$ npm install adaptive-memory-multi-model-router"
sleep 2
echo "✓ Installed"
echo ""

echo "🛤️  Routing a simple query..."
sleep 1
echo "$ npx a3m-router route \"What is 2+2?\""
sleep 2
echo ""
echo "  → Provider: groq/llama-3.3-70b"
echo "  → Cost: \$0.000009 (FREE tier available)"
echo "  → Response: \"2+2 equals 4\""
echo "  → Complexity score: 8/100 (TRIVIAL)"
echo ""

echo "🧠 Routing a complex query..."
sleep 1
echo "$ npx a3m-router route \"Explain quantum entanglement in detail\""
sleep 2
echo ""
echo "  → Provider: openai/gpt-4o"
echo "  → Cost: \$0.0036"
echo "  → Response: \"Quantum entanglement is a phenomenon...\""
echo "  → Complexity score: 78/100 (COMPLEX)"
echo ""

echo "📊 Benchmarking all providers..."
sleep 1
echo "$ npx a3m-router benchmark"
sleep 2
echo ""
echo "  Provider          | Avg Latency | Cost/1K tokens | Quality"
echo "  ------------------|-------------|----------------|--------"
echo "  CommandCode       | 5.2s        | \$0.00          | 72%"
echo "  Groq              | 420ms       | \$0.59/1M       | 82%"
echo "  Cerebras          | 380ms       | \$0.60/1M       | 81%"
echo "  Mistral           | 800ms       | \$2.00/1M       | 90%"
echo "  OpenAI GPT-4o     | 2.1s        | \$2.50/1M       | 95%"
echo ""

echo "💰 Cost comparison for 1M queries:"
echo "  All GPT-4o:  \$1,250.00"
echo "  A3M Router:  \$   87.50  (93% savings)"
echo ""

echo "🚀 Try it:"
echo "  npm install adaptive-memory-multi-model-router"
echo "  npx a3m-router serve   # Start OpenAI-compatible proxy"
echo ""
echo "GitHub: github.com/Das-rebel/adaptive-memory-multi-model-router"
