# A3M Router Research Log

## 2026-06-03 - Test Coverage Analysis

### Research State
```
Project: A3M Router Test Coverage Analysis
Date: 2026-06-03
Agents: 3 (Architecture, Performance, Test Coverage)
Goal: Identify top 3 improvements via council vote
```

### Scope Explored
- `test/` - 7 legacy JS test files (budgetEnforcer, observability, providerHealth, providerRetry, semanticCache)
- `tests/` - Vitest test suite (routing/ensembleVoting, routing/providerRetry, routing/queryTypePresets, memory/episodicMemory)
- `test-council/` - 5 test files (structure, edge-case, performance, integration, agent-council-eval)

### Key Source Files Analyzed
- `src/ensemble.ts` - EnsembleOrchestrator (no tests)
- `src/sdk.ts` - A3MRouter SDK (structure only)
- `src/cost/budgetEnforcer.ts` - Budget enforcement (legacy test)
- `src/analytics/costAnalytics.ts` - Cost analytics (no tests)
- `src/security/guardrails.ts` - GuardrailEngine (NO TESTS - CRITICAL)
- `src/observability/middleware.ts` - Express middleware (not tested)
- `src/routing/crossModelValidation.ts` - Cross-model validation (not tested)
- `src/observability/fatigueDetector.ts` - Fatigue detection (not tested)

### Coverage Summary
| Module | Coverage | Status |
|--------|----------|--------|
| Routing | Partial | ensembleVoting, providerRetry, queryTypePresets |
| Memory | Good | episodicMemory well tested |
| Observability | Partial | Tracer, MetricsCollector tested; middleware not |
| Security | NONE | GuardrailEngine untested |
| Cost | Partial | budgetEnforcer legacy test; costAnalytics untested |
| SDK | Structure only | No behavioral tests |

### Critical Gaps Identified
1. **GuardrailEngine** - Zero tests for security-critical code
2. **EnsembleOrchestrator** - Core P0 feature lacks integration tests
3. **CostAnalytics** - No tests for savings calculation accuracy
4. **SDK Class** - Only type checking, no behavioral tests
5. **Middleware** - Not tested

### Output
Created: `council-votes/coverage-vote.md`
Vote: Finding #1 (GuardrailEngine) as highest priority

---
