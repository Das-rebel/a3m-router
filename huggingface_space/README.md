---
title: A3M Router Demo
emoji: 🎯
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---

# A3M Router Demo

[A3M Router](https://github.com/Das-rebel/a3m-router) — intelligent LLM routing across 80+ providers. No.1 on RouterArena at 96.77% accuracy, $0.0768 per 1K queries.

## Features

- **System One routing** (`model="jev-auto"`): single-pass option-attention, calibrated probabilities, ~2ms warm
- **80+ Providers**: OpenAI, Anthropic, Groq, Cerebras, DeepSeek, Gemini, Mistral, NVIDIA NIM...
- **Cost Saving**: routes to cheapest capable model automatically (saves 70–95% vs GPT-4o)
- **Self-hosted**: full control, no vendor lock-in

## How It Works

1. Enter your query
2. Jev engine scores all providers in one forward pass
3. Routes to optimal provider based on query complexity + cost
4. Get fast, cost-effective responses

## Disclaimer

Deploy your own router via `npm install adaptive-memory-multi-model-router` for production use.
