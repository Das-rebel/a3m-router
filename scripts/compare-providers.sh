#!/bin/bash
# =============================================================================
# A3M Router — Provider Comparison Script
# =============================================================================
# Compares responses from multiple LLM providers to the SAME prompt.
# Works with any provider that has an OpenAI-compatible API.
#
# Usage:
#   ./scripts/compare-providers.sh "What is 2+2?"
#   ./scripts/compare-providers.sh                            # defaults
#
# Requires at least one of: GROQ_API_KEY, NV_API_KEY, CEREBRAS_API_KEY
# =============================================================================

set -e

PROMPT="${1:-Say hello in exactly 3 words.}"
TIMEOUT=15

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  A3M Router — Provider Comparison${NC}"
echo -e "${BLUE}  Prompt: \"${PROMPT}\"${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

COMPLETED=0
FAILED=0

# -------------------------------------------------------------------------
# Helper: call a provider and save result
# -------------------------------------------------------------------------
call_provider() {
  local name=$1
  local url=$2
  local auth_header=$3
  local model=$4
  local data_file="$RESULTS_DIR/${name//\//_}.json"

  # Build the curl payload
  local payload
  payload=$(jq -n \
    --arg model "$model" \
    --arg content "$PROMPT" \
    '{
      model: $model,
      messages: [{role: "user", content: $content}],
      max_tokens: 100,
      temperature: 0.7
    }')

  # Execute with timeout, capture response and HTTP code
  local http_code
  http_code=$(curl -s -o "$data_file" -w "%{http_code}" \
    --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $auth_header" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$url" 2>/dev/null)

  if [ "$http_code" = "200" ]; then
    COMPLETED=$((COMPLETED + 1))
    echo "$data_file"
  else
    FAILED=$((FAILED + 1))
    # Store error for display
    echo "{\"error\": true, \"http_code\": $http_code, \"body\": $(cat "$data_file" 2>/dev/null || echo '"timeout or connection error"')}" > "$data_file"
    echo "$data_file"
  fi
}

# -------------------------------------------------------------------------
# Print a single provider's result
# -------------------------------------------------------------------------
print_result() {
  local name=$1
  local color=$2
  local data_file=$3

  if jq -e '.error == true' "$data_file" >/dev/null 2>&1; then
    local code
    code=$(jq -r '.http_code' "$data_file")
    echo -e "${color}  ❌ $name${NC} (HTTP $code)"
    jq -r '.body | if length > 200 then .[0:200] + "..." else . end' "$data_file" 2>/dev/null | sed 's/^/    /'
    return
  fi

  local content model usage_in usage_out usage_total
  content=$(jq -r '.choices[0].message.content // "N/A"' "$data_file" 2>/dev/null)
  model=$(jq -r '.model // "N/A"' "$data_file" 2>/dev/null)
  usage_in=$(jq -r '.usage.prompt_tokens // "?"' "$data_file" 2>/dev/null)
  usage_out=$(jq -r '.usage.completion_tokens // "?"' "$data_file" 2>/dev/null)

  echo -e "${color}  ● $name${NC}"
  echo "    Model:      $model"
  echo "    Tokens:     ${usage_in} in / ${usage_out} out"
  echo "    Response:   $content"
}

# =============================================================================
# Collect results (parallel execution)
# =============================================================================

echo -e "${YELLOW}  Sending parallel requests...${NC}"
echo ""

# Groq
if [ -n "$GROQ_API_KEY" ]; then
  groq_file=$(call_provider "Groq" \
    "https://api.groq.com/openai/v1/chat/completions" \
    "$GROQ_API_KEY" \
    "llama-3.3-70b-versatile")
else
  echo -e "${RED}  ❌ Groq — GROQ_API_KEY not set${NC}"
  FAILED=$((FAILED + 1))
fi

# NVIDIA NIM
if [ -n "$NV_API_KEY" ]; then
  nvidia_file=$(call_provider "NVIDIA NIM" \
    "https://integrate.api.nvidia.com/v1/chat/completions" \
    "$NV_API_KEY" \
    "meta/llama-3.3-70b-instruct")
else
  echo -e "${RED}  ❌ NVIDIA NIM — NV_API_KEY not set${NC}"
  FAILED=$((FAILED + 1))
fi

# Cerebras
if [ -n "$CEREBRAS_API_KEY" ]; then
  cerebras_file=$(call_provider "Cerebras" \
    "https://api.cerebras.ai/v1/chat/completions" \
    "$CEREBRAS_API_KEY" \
    "llama-3.3-70b")
else
  echo -e "${RED}  ❌ Cerebras — CEREBRAS_API_KEY not set${NC}"
  FAILED=$((FAILED + 1))
fi

# OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
  openai_file=$(call_provider "OpenAI" \
    "https://api.openai.com/v1/chat/completions" \
    "$OPENAI_API_KEY" \
    "gpt-4o-mini")
else
  echo -e "${RED}  ❌ OpenAI — OPENAI_API_KEY not set${NC}"
  FAILED=$((FAILED + 1))
fi

# Anthropic (different API shape, handle separately)
if [ -n "$ANTHROPIC_API_KEY" ]; then
  anthro_file="$RESULTS_DIR/anthropic.json"
  local http_code
  http_code=$(curl -s -o "$anthro_file" -w "%{http_code}" \
    --max-time "$TIMEOUT" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg content "$PROMPT" \
      '{
        model: "claude-3-5-haiku-latest",
        max_tokens: 100,
        messages: [{role: "user", content: $content}]
      }')" \
    "https://api.anthropic.com/v1/messages" 2>/dev/null)

  if [ "$http_code" = "200" ]; then
    COMPLETED=$((COMPLETED + 1))
  else
    echo "{\"error\": true, \"http_code\": $http_code}" > "$anthro_file"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}  ❌ Anthropic — ANTHROPIC_API_KEY not set${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""

# =============================================================================
# Print results
# =============================================================================
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Results — ${COMPLETED} succeeded, ${FAILED} failed${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Print each result if the file exists
[ -n "$groq_file" ] && [ -f "$groq_file" ] && print_result "Groq" "$MAGENTA" "$groq_file"
[ -n "$nvidia_file" ] && [ -f "$nvidia_file" ] && print_result "NVIDIA NIM" "$CYAN" "$nvidia_file"
[ -n "$cerebras_file" ] && [ -f "$cerebras_file" ] && print_result "Cerebras" "$GREEN" "$cerebras_file"
[ -n "$openai_file" ] && [ -f "$openai_file" ] && print_result "OpenAI" "$YELLOW" "$openai_file"
if [ -n "$anthro_file" ] && [ -f "$anthro_file" ]; then
  if jq -e '.error == true' "$anthro_file" >/dev/null 2>&1; then
    echo -e "${RED}  ❌ Anthropic (HTTP $(jq -r '.http_code' "$anthro_file"))${NC}"
  else
    local content
    content=$(jq -r '.content[0].text // "N/A"' "$anthro_file" 2>/dev/null)
    local model
    model=$(jq -r '.model // "N/A"' "$anthro_file" 2>/dev/null)
    echo -e "${BLUE}  ● Anthropic${NC}"
    echo "    Model:      $model"
    echo "    Response:   $content"
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Run with A3M Proxy (after ${YELLOW}npx a3m-router serve${NC}):"
echo ""
echo "    curl http://localhost:8787/v1/chat/completions \\"
echo "      -H \"Content-Type: application/json\" \\"
echo "      -d '{\"model\":\"auto\",\"messages\":[{\"role\":\"user\",\"content\":\"$PROMPT\"}]}'"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
