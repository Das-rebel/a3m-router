#!/bin/bash
# A3M Router Benchmark Script
# Compares: All-GPT-4 vs Smart Routing vs All-Cheap

echo "=== A3M Router Cost Benchmark ==="
echo ""
echo "Running 100 simulated queries..."
echo "  47 simple (Q&A, math, basic tasks)"
echo "  33 medium (summarization, translation, code)"
echo "  20 complex (reasoning, creative writing, analysis)"
echo ""

# Cost per 1K tokens (input)
GPT4_COST=0.03          # $30/1M tokens
GPT4_MINI_COST=0.00015  # $0.15/1M tokens
GROQ_COST=0.00059       # $0.59/1M tokens
CEREBRAS_COST=0.00060   # $0.60/1M tokens
FREE_COST=0.00          # CommandCode/OpenCode

# Average tokens per query type
SIMPLE_TOKENS=150
MEDIUM_TOKENS=500
COMPLEX_TOKENS=1200

# All GPT-4 baseline
all_gpt4=$(echo "scale=4; (47 * $SIMPLE_TOKENS + 33 * $MEDIUM_TOKENS + 20 * $COMPLEX_TOKENS) * $GPT4_COST / 1000" | bc)
echo "📊 All queries → GPT-4o:"
echo "   Cost: \$$all_gpt4"
echo ""

# Smart routing (A3M approach)
# Simple → Groq/Cerebras, Medium → GPT-4o-mini, Complex → GPT-4o
smart_simple=$(echo "scale=4; 47 * $SIMPLE_TOKENS * $GROQ_COST / 1000" | bc)
smart_medium=$(echo "scale=4; 33 * $MEDIUM_TOKENS * $GPT4_MINI_COST / 1000" | bc)
smart_complex=$(echo "scale=4; 20 * $COMPLEX_TOKENS * $GPT4_COST / 1000" | bc)
smart_total=$(echo "scale=4; $smart_simple + $smart_medium + $smart_complex" | bc)
savings=$(echo "scale=1; (1 - $smart_total / $all_gpt4) * 100" | bc)
echo "📊 A3M Router (smart routing):"
echo "   Simple (47) → Groq:     \$$smart_simple"
echo "   Medium (33) → GPT-4o-mini: \$$smart_medium"
echo "   Complex (20) → GPT-4o:  \$$smart_complex"
echo "   Total: \$$smart_total"
echo "   Savings: ${savings}%"
echo ""

# All cheap (worst quality)
all_cheap=$(echo "scale=4; (47 * $SIMPLE_TOKENS + 33 * $MEDIUM_TOKENS + 20 * $COMPLEX_TOKENS) * $GROQ_COST / 1000" | bc)
echo "📊 All queries → Groq (cheapest):"
echo "   Cost: \$$all_cheap"
echo "   Quality: Lower (complex queries suffer)"
echo ""

# Monthly projection at scale
echo "=== Monthly Projection ==="
for queries in "10000" "100000" "1000000"; do
  scale=$(echo "scale=0; $queries / 100" | bc)
  gpt4_monthly=$(echo "scale=2; $all_gpt4 * $scale" | bc)
  smart_monthly=$(echo "scale=2; $smart_total * $scale" | bc)
  monthly_savings=$(echo "scale=2; $gpt4_monthly - $smart_monthly" | bc)
  printf "  %s queries/month: GPT-4=\$%-8s A3M=\$%-8s Save=\$%s/mo\n" "$queries" "$gpt4_monthly" "$smart_monthly" "$monthly_savings"
done
