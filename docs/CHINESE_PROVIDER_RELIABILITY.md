# Chinese Provider Reliability Playbook

This playbook captures retry/fail-fast guidance for Chinese LLM providers used by A3M.

## Why this exists

A generic `429 => retry` rule is often too coarse. Some Chinese-provider 429/4xx states are account/quota policy states that should fail fast instead of burning retries.

## A3M policy

- Retry:
  - transient network failures (`ECONNRESET`, `ETIMEDOUT`, 5xx)
  - throttling with temporary overload semantics
  - 429 with explicit `Retry-After` timing
- Fail fast (non-retryable):
  - auth/policy/billing/account states (401/402/403)
  - account abnormal / access terminated
  - hard quota exhaustion messaging (hour/week/month quota exhausted, org TPD exceeded)

## Implemented in code

- `src/routing/providerRetry.ts`
  - `isPermanentProviderStateError(...)` now guards retries.

## Validation

- `eval/run_fault_injection.js`
  - Includes `no_retry_on_chinese_quota_account_errors` scenario.

## Operational guidance

- Track provider-specific errors by normalized category:
  - `transient`, `rate_limit_transient`, `quota_hard`, `auth`, `account_policy`, `server`
- Use this categorization to:
  - reduce wasted retries
  - improve fallback quality
  - produce cleaner incident dashboards
