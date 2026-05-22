# A3M Engineering Spec (Canonical)

This is the canonical engineering behavior spec for A3M Router.
Marketing and launch content are non-canonical; if there is a conflict, this file wins.

## Core Routing Contract

- Input: `routeQuery(prompt: string, available_models?: string[], budget_multiplier?: number)`
- Output:
  - `primary_model`
  - `fallback_models`
  - `confidence`
  - `estimated_cost`
  - `estimated_latency_ms`
  - `features` (complexity + flags + domain)
  - `provider_type`

## Reliability Components

- Retry handling:
  - `ProviderRetryHandler` supports transient retries, backoff+jitter, and rate-limit handling.
- Health management:
  - `ProviderHealthManager` maintains rolling health and circuit breaker states.
  - Circuit breaker opens after configured consecutive failures.
- Fallback chain:
  - Health-sorted fallback ordering with unavailable providers pushed down.

## Guardrails

- Input and output checks implemented in `src/security/guardrails.ts`.
- Includes prompt injection scoring, PII detection/redaction, and output validation hooks.

## Cost/Budget

- Budget enforcement and spend tracking:
  - `src/cost/budgetEnforcer.ts`
  - `src/cost/costTracker.ts`

## Proxy Server

- OpenAI-compatible endpoints implemented in `src/server/proxyServer.ts`.
- Expected behavior:
  - Model resolution through mapper + router
  - Provider call with fallback behavior
  - Usage/cost logging for requests

## Validation Gates (Required)

- Node test suite: `npm test`
- Python tests: `npm run test:py`
- Routing eval: `npm run eval:routing`
- Golden routing regression: `npm run eval:golden`
- Fault injection reliability: `npm run eval:faults`

All gates above must pass for release readiness.
