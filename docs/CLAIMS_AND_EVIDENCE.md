# Claims and Evidence

This file maps product claims to reproducible evidence in-repo.

## Routing correctness and stability

- Claim: routing behavior is stable across releases.
- Evidence:
  - `eval/benchmark_dataset.jsonl`
  - `eval/golden_routes.json`
  - `npm run eval:golden`

## Routing quality thresholds

- Claim: routing meets minimum quality bars for complexity/flags/domain/provider type.
- Evidence:
  - `eval/thresholds.json`
  - `eval/run_eval.js`
  - `npm run eval:routing`
  - Output artifact: `eval/results/latest.json`

## Reliability under failure

- Claim: retry/circuit-breaker/fallback logic works under failure scenarios.
- Evidence:
  - `eval/run_fault_injection.js`
  - `eval/fault_injection_thresholds.json`
  - `npm run eval:faults`
  - Output artifact: `eval/results/fault_injection_latest.json`

## Test coverage enforcement

- Claim: changes are tested in CI before merge.
- Evidence:
  - `.github/workflows/ci.yml`
  - Includes:
    - `npm test`
    - `npm run eval:routing`
    - `npm run eval:golden`
    - `npm run eval:faults`
    - `npm run eval:shadow`
    - `npm run test:py`

## Baseline governance

- Baseline file:
  - `eval/baselines/main.json`
- Rule:
  - Update baseline only when behavior change is intentional.
  - PR must explain what changed and why.

## Experiment traceability

- Claim: evaluation outcomes are auditable over time.
- Evidence:
  - `eval/lib/experiment_registry.js`
  - `eval/experiments.jsonl` (local append-only run log)
  - each eval runner appends run metadata + decision.
