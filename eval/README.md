# Routing Evaluation Harness

This directory contains the reproducible evaluation system for A3M.

## Files

- `benchmark_dataset.jsonl`: frozen routing benchmark dataset
- `datasets/catalog.json`: dataset registry and slice metadata
- `datasets/slices/*.jsonl`: versioned slice datasets
- `thresholds.json`: minimum quality thresholds + max allowed regression
- `fault_injection_thresholds.json`: reliability gate threshold
- `golden_routes.json`: golden route snapshot
- `baselines/main.json`: baseline summary for `main` branch
- `run_eval.js`: routing evaluator + hard gate
- `check_golden_routes.js`: golden regression check
- `run_fault_injection.js`: retry/health fault scenarios
- `run_shadow_eval.js`: shadow routing comparison (informational)
- `generate_report.js`: markdown summary from eval result artifacts
- `experiments.jsonl`: append-only experiment registry (local artifact)
- `results/*.json`: generated run outputs (not committed)
- `results/report_latest.md`: generated markdown evidence report

## Run

```bash
npm run eval:all
```

`eval:all` includes:

1. `eval:routing` — hard gate for routing quality thresholds
2. `eval:golden` — snapshot consistency gate
3. `eval:faults` — reliability fault injection gate
4. `eval:shadow` — candidate-vs-primary divergence and projected cost delta (informational)
5. `eval:report` — consolidated markdown release summary

## Updating Baseline

Only update `baselines/main.json` when routing behavior changes intentionally.

Suggested process:

1. Run `npm run eval:routing`
2. Review `eval/results/latest.json`
3. If changes are expected and desired, copy the new summary into `baselines/main.json`
4. Mention the reason in your PR/commit message
