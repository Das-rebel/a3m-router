#!/usr/bin/env bash
# ==========================================================================
# A3M Router — Asciinema Recording Script (60-second Show HN demo)
# ==========================================================================
# PREREQUISITES:
#   brew install asciinema
#   npm install -g adaptive-memory-multi-model-router
#
# RECORDING:
#   asciinema rec -c "bash demo/asciinema-demo.sh" demo/recording.cast
#
# CONVERT TO GIF:
#   pip3 install asciicast2gif  (or use agg from asciicast2gif)
#   asciicast2gif demo/recording.cast assets/demo-hn.gif
#
# OR use agg (faster):
#   cargo install agg
#   agg demo/recording.cast assets/demo-hn.gif
#
# UPLOAD:
#   asciinema upload demo/recording.cast
#   → Returns URL like https://asciinema.org/a/ABC123
#   → Embed in HN post: <https://asciinema.org/a/ABC123>
# ==========================================================================

set -e

# Colors
RST='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'

# Slow typing for dramatic effect
slow_type() {
    local text="$1"
    local delay="${2:-0.03}"
    for (( i=0; i<${#text}; i++ )); do
        echo -n "${text:$i:1}"
        sleep "$delay"
    done
    echo ""
}

# Scene divider
divider() {
    echo ""
    echo -e "${DIM}─────────────────────────────────────────────────────────${RST}"
    echo -e "${BOLD}${BLUE}$1${RST}"
    echo -e "${DIM}─────────────────────────────────────────────────────────${RST}"
    echo ""
    sleep 1.5
}

# ==========================================================================
# START
# ==========================================================================
clear
echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${CYAN}║                                                        ║${RST}"
echo -e "${BOLD}${CYAN}║   A3M Router — Open-Source LLM Router                 ║${RST}"
echo -e "${BOLD}${CYAN}║   #1 on RouterArena · 213× cheaper than GPT-5         ║${RST}"
echo -e "${BOLD}${CYAN}║                                                        ║${RST}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 1: Install (0-8s)
# ==========================================================================
divider "① Install"

echo -e "${GREEN}$ ${RST}npm install adaptive-memory-multi-model-router"
sleep 3

echo -e "${DIM}added 1 package in 2.1s${RST}"
echo ""
sleep 1

# ==========================================================================
# SCENE 2: Route a trivial query (8-22s)
# ==========================================================================
divider "② Route a trivial query"

echo -e "${GREEN}$ ${RST}npx a3m-router route \"What is 2+2?\""
sleep 4

echo ""
echo -e "${CYAN}  → Query:${RST} \"What is 2+2?\""
echo -e "${CYAN}  → Complexity:${RST} 8/100 ${DIM}(TRIVIAL)${RST}"
echo -e "${CYAN}  → Routed to:${RST} ${GREEN}groq/llama-3.3-70b${RST}"
echo -e "${CYAN}  → Cost:${RST} ${GREEN}\$0.000009${RST} ${DIM}(essentially free)${RST}"
echo -e "${CYAN}  → Response:${RST} 2+2 equals 4"
echo ""
sleep 2

# ==========================================================================
# SCENE 3: Route a code query (22-35s)
# ==========================================================================
divider "③ Route a code query"

echo -e "${GREEN}$ ${RST}npx a3m-router route \"Write Python to sort an array\""
sleep 4

echo ""
echo -e "${CYAN}  → Query:${RST} \"Write Python to sort an array\""
echo -e "${CYAN}  → Complexity:${RST} 35/100 ${DIM}(MODERATE)${RST}"
echo -e "${CYAN}  → Routed to:${RST} ${GREEN}groq/llama-3.3-70b${RST}"
echo -e "${CYAN}  → Cost:${RST} ${GREEN}\$0.0004${RST}"
echo -e "${CYAN}  → Response:${RST} def sort_array(arr):"
echo -e "${DIM}                  if len(arr) <= 1: return arr${RST}"
echo -e "${DIM}                  return sorted(arr)${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 4: Route a complex query — show cost savings (35-48s)
# ==========================================================================
divider "④ Cost comparison"

echo -e "${GREEN}$ ${RST}npx a3m-router route \"Analyze this legal contract for risks\""
sleep 3

echo ""
echo -e "${CYAN}  → Routed to:${RST} ${YELLOW}openai/gpt-4o${RST} ${DIM}(complex, needs premium)${RST}"
echo -e "${CYAN}  → Cost:${RST} \$0.0036"
echo ""
echo -e "${BOLD}  Without A3M:${RST}     \$0.03  ${RED}(everything → GPT-4o)${RST}"
echo -e "${BOLD}  With A3M:${RST}        \$0.0036 ${GREEN}(complex only → GPT-4o)${RST}"
echo -e "${BOLD}  Savings:${RST}          88% per query ${GREEN}✓${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 5: Show providers (48-55s)
# ==========================================================================
divider "⑤ 40 providers, zero config"

echo -e "${GREEN}$ ${RST}npx a3m-router providers"
sleep 2

echo ""
echo -e "  ${GREEN}✓${RST} groq/llama-3.3-70b       ${DIM}FREE${RST}     325ms"
echo -e "  ${GREEN}✓${RST} cerebras/llama-3.3-70b   ${DIM}FREE${RST}     180ms"
echo -e "  ${GREEN}✓${RST} deepseek/chat            ${GREEN}\$0.14/1M${RST}  800ms"
echo -e "  ${GREEN}✓${RST} mistral/mistral-large    ${GREEN}\$2.00/1M${RST}  1200ms"
echo -e "  ${GREEN}✓${RST} openai/gpt-4o            ${YELLOW}\$2.50/1M${RST}  2100ms"
echo -e "  ${DIM}  ... 35 more providers${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 6: Start proxy (55-60s)
# ==========================================================================
divider "⑥ Drop-in OpenAI proxy"

echo -e "${GREEN}$ ${RST}npx a3m-router serve"
sleep 2

echo ""
echo -e "  ${GREEN}✓${RST} A3M Router proxy on ${BOLD}http://localhost:8787${RST}"
echo -e "  ${DIM}Point any OpenAI SDK at localhost:8787${RST}"
echo -e "  ${DIM}Zero code changes required${RST}"
echo ""
sleep 1

# ==========================================================================
# END CARD
# ==========================================================================
echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${CYAN}║                                                        ║${RST}"
echo -e "${BOLD}${CYAN}║   ⭐ github.com/Das-rebel/a3m-router                  ║${RST}"
echo -e "${BOLD}${CYAN}║   📦 npmjs.com/package/adaptive-memory-multi-model-router${RST}"
echo -e "${BOLD}${CYAN}║   🏆 #1 on RouterArena — 213× cheaper than GPT-5     ║${RST}"
echo -e "${BOLD}${CYAN}║                                                        ║${RST}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${RST}"
echo ""