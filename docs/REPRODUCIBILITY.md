# Reproducibility Contract

This document defines the reproducible evaluation contract for A3M Router.

## Environment

- Node: `>=18` (CI uses Node 22)
- Python: `3.12` (for Python tests)
- Install:
  - `npm ci`
  - `python3 -m pip install pytest pytest-asyncio`

## Required commands

Run in repository root:

```bash
npm test
npm run test:py
npm run eval:routing
npm run eval:golden
npm run eval:faults
npm run eval:shadow
npm run eval:report
```

## Deterministic inputs

- Core regression dataset:
  - `eval/benchmark_dataset.jsonl`
- Golden snapshot:
  - `eval/golden_routes.json`
- Thresholds:
  - `eval/thresholds.json`
  - `eval/fault_injection_thresholds.json`

## Artifacts generated

- `eval/results/latest.json`
- `eval/results/fault_injection_latest.json`
- `eval/results/shadow_latest.json`
- `eval/results/report_latest.md`

## Experiment registry

- Every eval run appends to:
  - `eval/experiments.jsonl` (local artifact)
- Record includes:
  - timestamp
  - commit (if available)
  - experiment id
  - dataset version
  - metrics
  - decision

## Baseline update policy

- Baseline file: `eval/baselines/main.json`
- Only update baseline when behavior change is intentional.
- PR must explain:
  - what changed
  - why baseline needs update
  - expected impact on cost/quality/reliability
