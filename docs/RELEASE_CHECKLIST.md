# Release Checklist

Use this checklist before tagging a release.

## Mandatory quality gates

- [ ] `npm test` passes
- [ ] `npm run test:py` passes
- [ ] `npm run eval:routing` passes
- [ ] `npm run eval:golden` passes
- [ ] `npm run eval:faults` passes
- [ ] `npm run eval:report` passes

## Evidence artifacts reviewed

- [ ] `eval/results/latest.json` reviewed for routing summary
- [ ] `eval/results/fault_injection_latest.json` reviewed for reliability scenarios
- [ ] `eval/results/shadow_latest.json` reviewed for divergence/cost deltas
- [ ] `eval/results/report_latest.md` attached to release review
- [ ] Any baseline change in `eval/baselines/main.json` is intentional and explained

## Documentation consistency

- [ ] `docs/ENGINEERING_SPEC.md` reflects current behavior
- [ ] `docs/CLAIMS_AND_EVIDENCE.md` mappings are still valid
- [ ] Public claims do not exceed available evidence

## Release hygiene

- [ ] Version bump completed
- [ ] Changelog updated
- [ ] CI green on release commit
