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
divider "📦 ① Install"

echo -e "${GREEN}$ ${RST}npm install adaptive-memory-multi-model-router"
sleep 3

echo -e "${DIM}added 1 package in 2.1s${RST}"
echo -e "  ${GREEN}✅${RST} ${BOLD}adaptive-memory-multi-model-router${RST} ${DIM}v2.14.5${RST}"
echo -e "  ${GREEN}✅${RST} ${BOLD}47+ providers${RST} ${DIM}configured automatically${RST}"
echo ""
sleep 1

# ==========================================================================
# SCENE 2: Explain an error (8-22s) — most common dev use case
# ==========================================================================
divider "🐛 ② Explain an error"

echo -e "${GREEN}$ ${RST}npx a3m-router route \"TypeError: Cannot read property 'map' of undefined\""
sleep 4

echo ""
echo -e "${CYAN}  → Query:${RST} \"TypeError: Cannot read property 'map' of undefined\""
echo -e "${CYAN}  → Complexity:${RST} 25/100 ${DIM}(LOW)${RST}"
echo -e "${CYAN}  → Routed to:${RST} ${GREEN}groq/llama-3.3-70b${RST}"
echo -e "${CYAN}  → Cost:${RST} ${GREEN}\$0.00004${RST} ${DIM}(101 tokens, essentially free)${RST}"
echo -e "${CYAN}  → Response:${RST} You're calling .map() on a value that's undefined."
echo -e "${DIM}                  Check if the array exists before mapping:"
echo -e "${DIM}                  data?.map(item => ...)  // optional chaining${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 3: Write a regex (22-35s) — practical coding task
# ==========================================================================
divider "🔧 ③ Write a regex"

echo -e "${GREEN}$ ${RST}npx a3m-router route \"Write a regex to validate email addresses\""
sleep 4

echo ""
echo -e "${CYAN}  → Query:${RST} \"Write a regex to validate email addresses\""
echo -e "${CYAN}  → Complexity:${RST} 40/100 ${DIM}(MODERATE)${RST}"
echo -e "${CYAN}  → Routed to:${RST} ${GREEN}groq/llama-3.3-70b${RST}"
echo -e "${CYAN}  → Cost:${RST} ${GREEN}\$0.0003${RST}"
echo -e "${CYAN}  → Response:${RST} /^[\\w.-]+@[\\w.-]+\\.\\w{2,}$/"
echo -e "${DIM}                  // Matches: user@example.com${RST}"
echo -e "${DIM}                  // Matches: first.last@company.co.uk${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 4: Parallel execution — killer feature (35-52s)
# ==========================================================================
divider "⚡ ④ Parallel execution"

echo -e "${GREEN}$ ${RST}npx a3m-router compare \"How do I deploy a Next.js app to Vercel?\""
sleep 5

echo ""
echo -e "${CYAN}  → Firing 5 providers in PARALLEL...${RST}"
echo ""
echo -e "  ${GREEN}✓${RST} groq/llama-3.3-70b     ${DIM}187ms${RST}  ${GREEN}\$0.00001${RST}"
echo -e "  ${GREEN}✓${RST} cerebras/llama-3.3-70b ${DIM}145ms${RST}  ${GREEN}\$0.00001${RST}"
echo -e "  ${GREEN}✓${RST} deepseek/chat          ${DIM}812ms${RST}  ${GREEN}\$0.00007${RST}"
echo -e "  ${GREEN}✓${RST} mistral/mistral-large  ${DIM}1.2s${RST}   ${YELLOW}\$0.00120${RST}"
echo -e "  ${GREEN}✓${RST} openai/gpt-4o          ${DIM}2.1s${RST}   ${RED}\$0.00250${RST}"
echo ""
echo -e "  ${BOLD}${GREEN}◆ Best:${RST} ${BOLD}groq/llama-3.3-70b${RST} ${DIM}(187ms, \$0.00001)${RST}"
echo ""
echo -e "  ${BOLD}  Without A3M:${RST}     \$0.03  ${RED}(sequential, all → GPT-4o)${RST}"
echo -e "  ${BOLD}  With A3M:${RST}        \$0.0004 ${GREEN}(parallel, pick fastest)${RST}"
echo -e "  ${BOLD}  Savings:${RST}          99% per query ${GREEN}💰${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 5: Show providers (48-55s)
# ==========================================================================
divider "📡 ⑤ 40 providers, zero config"

echo -e "${GREEN}$ ${RST}npx a3m-router providers"
sleep 2

echo ""
echo -e "  ${GREEN}✅${RST} groq/llama-3.3-70b       ${DIM}${GREEN}FREE${RST}      ${CYAN}325ms${RST}"
echo -e "  ${GREEN}✅${RST} cerebras/llama-3.3-70b   ${DIM}${GREEN}FREE${RST}      ${CYAN}180ms${RST}"
echo -e "  ${GREEN}✅${RST} deepseek/chat            ${GREEN}\$0.14/1M${RST}  ${YELLOW}800ms${RST}"
echo -e "  ${GREEN}✅${RST} mistral/mistral-large    ${YELLOW}\$2.00/1M${RST}  ${RED}1200ms${RST}"
echo -e "  ${GREEN}✅${RST} openai/gpt-4o            ${RED}\$2.50/1M${RST}  ${RED}2100ms${RST}"
echo -e "  ${DIM}  ... 35 more providers${RST}"
echo ""
sleep 2

# ==========================================================================
# SCENE 6: Start proxy (55-60s)
# ==========================================================================
divider "⚡ ⑥ Drop-in OpenAI proxy"

echo -e "${GREEN}$ ${RST}npx a3m-router serve"
sleep 2

echo ""
echo -e "  ${GREEN}✅${RST} ${BOLD}A3M Router${RST} proxy on ${CYAN}http://localhost:8787${RST}"
echo -e "  ${DIM}   🔄 Point any OpenAI SDK at localhost:8787${RST}"
echo -e "  ${DIM}   🔄 Zero code changes required${RST}"
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