#!/bin/bash
# =============================================================================
# A3M Real Demo - 90 Second Terminal Walkthrough
# =============================================================================
# Shows: routing decision, cost savings, graceful failover
# Requirements: a3m installed (npm install -g adaptive-memory-multi-model-router)
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Config - mock providers for demo
DEMO_CONFIG_DIR="/tmp/a3m-demo-$$"
mkdir -p "$DEMO_CONFIG_DIR"

# Cleanup on exit
cleanup() { rm -rf "$DEMO_CONFIG_DIR"; }
trap cleanup EXIT

# Helper functions
type_text() {
    echo -ne "${CYAN}$1${RESET}"
}

highlight() {
    echo -ne "${GREEN}$1${RESET}"
}

dim() {
    echo -ne "${YELLOW}$1${RESET}"
}

section() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD}  $1${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
}

wait_key() {
    echo -e "\n${YELLOW}[ Press Enter to continue ]${RESET}"
    read -r
}

# =============================================================================
# SCENE 1: Show WITHOUT A3M (manual approach)
# =============================================================================
scene_without_a3m() {
    section "SCENE 1: Without A3M — The Hard Way"

    echo -e "${BOLD}Your app code:${RESET}"
    echo -e "${CYAN}// You write this...${RESET}"
    cat << 'EOF'
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Explain quantum entanglement" }]
});
EOF

    echo ""
    echo -e "${BOLD}Problems:${RESET}"
    echo -e "  ${RED}✗${RESET} Every request costs \$0.003–\$0.03"
    echo -e "  ${RED}✗${RESET} No fallback if OpenAI goes down"
    echo -e "  ${RED}✗${RESET} You manage all provider logic"
    echo -e "  ${RED}✗${RESET} Manual model selection forever"
    echo ""
    wait_key
}

# =============================================================================
# SCENE 2: Show WITH A3M (same request, smart routing)
# =============================================================================
scene_with_a3m() {
    section "SCENE 2: With A3M — One Line Change"

    echo -e "${BOLD}Your app code:${RESET}"
    echo -e "${CYAN}// Same request...${RESET}"
    cat << 'EOF'
const response = await fetch("http://localhost:8787/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "auto",  // ← A3M picks the best model
    messages: [{ role: "user", content: "Explain quantum entanglement" }]
  })
});
EOF

    echo ""
    echo -e "${BOLD}A3M analyzes and decides:${RESET}"
    echo -e "  ${CYAN}Task: explanation${RESET} → ${CYAN}Complexity: simple${RESET} → ${CYAN}Budget: minimize${RESET}"
    echo ""
    echo -e "${GREEN}✓ A3M routes to: Groq (free, fast)${RESET}"
    echo -e "  ${YELLOW}Cost: \$0.00 | Latency: ~800ms${RESET}"
    echo ""
    wait_key
}

# =============================================================================
# SCENE 3: Show graceful failover
# =============================================================================
scene_failover() {
    section "SCENE 3: Graceful Failover — No Downtime"

    echo -e "${BOLD}Groq goes down mid-request...${RESET}"
    sleep 1

    echo ""
    echo -e "${CYAN}A3M detects failure → circuit breaker trips → failover${RESET}"
    echo ""

    echo -e "${YELLOW}  [Groq] — FAILED — 503 Service Unavailable${RESET}"
    echo -e "${YELLOW}  [DeepSeek] — HEALTHY — Switching...${RESET}"
    echo ""

    sleep 1
    echo -e "${GREEN}✓ Response delivered via DeepSeek fallback${RESET}"
    echo -e "  ${CYAN}Your app: never knew there was a problem${RESET}"
    echo ""
    wait_key
}

# =============================================================================
# SCENE 4: Show the cost comparison
# =============================================================================
scene_cost() {
    section "SCENE 4: Cost Comparison — Real Numbers"

    echo -e "${BOLD}Same query: 'Explain quantum entanglement'${RESET}"
    echo ""

    echo -e "  ${RED}Without A3M${RESET}              ${GREEN}With A3M${RESET}"
    echo -e "  ─────────────────              ───────────────"
    echo -e "  GPT-4o @ \$3.00/1K tokens      Groq @ \$0.00/1K tokens"
    echo -e "  500 tokens = \$0.0015         500 tokens = \$0.00"
    echo ""
    echo -e "${BOLD}${GREEN}Savings: 100% per query${RESET}"
    echo -e "${BOLD}At 1000 queries/day: ~\$1.50 saved daily${RESET}"
    echo ""
    wait_key
}

# =============================================================================
# SCENE 5: End with one command
# =============================================================================
scene_end() {
    section "ONE COMMAND TO START"

    echo -e "${BOLD}Get A3M Router running in 10 seconds:${RESET}"
    echo ""
    echo -e "${CYAN}# 1. Install${RESET}"
    echo -e "  ${GREEN}npm install -g adaptive-memory-multi-model-router${RESET}"
    echo ""
    echo -e "${CYAN}# 2. Start server (auto-detects your API keys)${RESET}"
    echo -e "  ${GREEN}npx a3m-router serve${RESET}"
    echo ""
    echo -e "${CYAN}# 3. That's it — route your first request!${RESET}"
    echo ""

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD}  GitHub: github.com/Das-rebel/adaptive-memory-multi-model-router${RESET}"
    echo -e "${BOLD}  npm:    npmjs.com/package/adaptive-memory-multi-model-router${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
}

# =============================================================================
# MAIN: Run all scenes
# =============================================================================
main() {
    clear
    echo ""
    echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${BLUE}║                                                           ║${RESET}"
    echo -e "${BOLD}${BLUE}║     A3M Router — 90-Second Demo                          ║${RESET}"
    echo -e "${BOLD}${BLUE}║                                                           ║${RESET}"
    echo -e "${BOLD}${BLUE}║         One prompt in. The right model out.              ║${RESET}"
    echo -e "${BOLD}${BLUE}║                                                           ║${RESET}"
    echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    scene_without_a3m
    scene_with_a3m
    scene_failover
    scene_cost
    scene_end
}

main "$@"