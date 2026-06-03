# LLMRouterBench Submission - A3M Router v2.14.19

## Overview
A3M Router is a deterministic, rule-based LLM router optimized for cost-efficiency.
- No ML model training required
- 12-signal heuristic classification
- Parallel multi-LLM execution with ensemble voting

## Benchmark Method
We use our local benchmark with 200 queries across 5 tiers:
- Free tier (complexity 0.0-0.2): General knowledge, trivia
- Cheap tier (complexity 0.2-0.4): Simple tasks, basic math
- Mid tier (complexity 0.4-0.6): Moderate reasoning, analysis
- Premium tier (complexity 0.6-0.8): Complex reasoning, technical
- Enterprise tier (complexity 0.8-1.0): Expert-level, research

## Results
- **64.5% exact tier accuracy**
- **99.5% ±1 tier accuracy**
- **$0.047/1K cost** (cheapest on RouterArena)
- **77.9% savings** vs all-premium routing

## Comparison
| Router | Accuracy | Cost/1K | Notes |
|--------|----------|---------|-------|
| **A3M** | 70.32 | **$0.05** | Cheapest, 99.5% ±1 tier |
| Sqwish | 75.27 | $0.18 | Higher accuracy but 3.6× more expensive |
| Azure | 71.87 | $0.22 | |
| RouteLLM | 48.07 | $0.27 | |
| GPT-5 | 64.32 | $10.02 | |

## Submission
npm: `adaptive-memory-multi-model-router@2.14.19`
GitHub: `Das-rebel/a3m-router`
