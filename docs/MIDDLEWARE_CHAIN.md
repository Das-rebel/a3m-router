# A3M Router — Middleware Chain

Pre-flight checks before every routing decision.

## Chain Order

```
1. Guardrails Check   → 9 STOP conditions (docs/ANALYSIS_PRINCIPLES.md)
2. Provider Health    → Quick ping all providers (<50ms)
3. Budget Check       → Remaining budget vs estimated cost (<1ms)
4. Version Check      → npm upgrade available? (cached 24h)
5. Cache Lookup       → Semantic cache for repeated queries (<5ms)
6. Route → Execute    → Call selected provider(s)
7. Log                → Write audit-log.ndjson entry
8. Cross-Validate     → If --validate flag, call second provider (<500ms)
9. Return Response
```

## Implementation Status

| Step | Status | File |
|------|--------|------|
| 1. Guardrails | ✅ | docs/ANALYSIS_PRINCIPLES.md |
| 2. Health | ✅ | src/routing/providerHealth.ts |
| 3. Budget | ✅ | src/cost/budgetEnforcer.ts |
| 4. Version | ✅ | bin/a3m-upgrade-check |
| 5. Cache | ✅ | src/cache/semanticCache.ts |
| 6. Route | ✅ | src/routing/advancedRouter.ts |
| 7. Log | ⚠️ | ~/.a3m-router/audit-log.ndjson |
| 8. Validate | ✅ | src/routing/crossModelValidation.ts |
| 9. Return | ✅ | CLI built-in |

## Why

Every link is a reliability guarantee. Broken chain = charged for failed queries.
