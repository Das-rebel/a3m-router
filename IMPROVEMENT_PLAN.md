# A3M Router Improvement Plan: Target 80% Accuracy

## Current State (Local Benchmark v2.14.26)
- **Overall Accuracy**: 67% (134/200)
- **Target**: 80% (160/200)
- **Gap**: +26 correct answers needed

## Problem Areas

### 1. MID Tier: 36% → Need 70%
- **Current**: 18/50 correct
- **Problem**: 22 queries under-routed to CHEAP, 9 over-routed to PREMIUM
- **Impact**: +17 potential correct

### 2. PREMIUM Tier: 58% → Need 75%  
- **Current**: 23/40 correct
- **Problem**: 11 queries under-routed to MID, 4 to CHEAP, 2 to FREE
- **Impact**: +9 potential correct

### 3. CHEAP Tier: 75% → Keep at 80%+
- **Current**: 45/60 correct (13 under-routed to FREE)

## Root Cause Analysis

The router uses a single "complexity" score (0-1) to route queries. The problem:

1. **MID queries scored too low** → routed to CHEAP (44% error rate)
2. **PREMIUM queries scored too low** → routed to MID/CHEAP (30% error rate)

### Current Complexity Signal Weights
- Word count: up to 0.35
- Jargon: up to 0.35
- Formality: up to 0.19
- Depth indicators: up to 0.17
- Stakes indicators: up to 0.12
- Multi-step: up to 0.11
- Domain detection: up to 0.35
- Code detection: +0.15
- Reasoning detection: +0.20
- Multilingual: +0.10

**Problem**: These signals don't differentiate enough between CHEAP and MID/PREMIUM tiers.

## Proposed Signal Improvements

### A. MID Tier Detection Signals (Priority 1)

**Add these to complexity score:**
1. **Technical depth markers** (+0.15): "implement", "architecture", "system design", "optimize", "performance"
2. **Analysis requirements** (+0.12): "compare and contrast", "evaluate", "assess", "analyze the tradeoffs"
3. **Multi-conceptual** (+0.10): Queries mentioning 3+ concepts that need to be connected
4. **Specific domain expertise** (+0.08): Medical, legal, financial, security terminology

### B. PREMIUM Tier Detection Signals (Priority 2)

**Add these to complexity score:**
1. **Advanced reasoning** (+0.20): "prove that", "derive", "synthesize", "create a new approach"
2. **Multi-modal requirements** (+0.15): Code + data + explanation needs
3. **Novel generation** (+0.15): "write a story", "generate code", "create a solution"
4. **High-stakes context** (+0.12): Decisions with significant consequences

### C. Calibration Fixes

1. **Don't route to FREE** if:
   - Query has any technical terms
   - Query length > 75 words
   - Query asks for explanation/analysis

2. **Don't route to CHEAP** if:
   - Query has 2+ mid-tier indicators
   - Domain is medical/legal/financial/security

3. **Route to PREMIUM** if:
   - Query explicitly asks for reasoning chain
   - Query is about system architecture
   - Query requires code generation AND explanation

## Implementation Order

### Phase 1: Fix MID→CHEAP under-routing
- Add mid-tier specific signals
- Recalibrate complexity thresholds
- Target: MID tier 36% → 60%

### Phase 2: Fix PREMIUM under-routing  
- Add premium-tier specific signals
- Target: PREMIUM tier 58% → 75%

### Phase 3: Protect CHEAP tier
- Ensure CHEAP queries don't leak to FREE
- Target: Keep CHEAP at 75%+

## Expected Results

| Tier | Current | Phase 1 | Phase 2 | Final |
|------|---------|---------|---------|-------|
| FREE | 96% | 96% | 96% | 96% |
| CHEAP | 75% | 70% | 70% | 80% |
| MID | 36% | 60% | 65% | 70% |
| PREMIUM | 58% | 58% | 75% | 75% |
| **Overall** | **67%** | **70%** | **76%** | **80%** |

## Testing Strategy

1. Run local benchmark after each change
2. Only submit to RouterArena when local benchmark shows 80%+
3. Use RouterArena validation as final check, not development tool
