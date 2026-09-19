# Dependency Audit Report

**Date:** 2026-05-28
**Project:** adaptive-memory-multi-model-router (v2.13.18)

## Summary

| Metric | Value |
|--------|-------|
| Total dependencies | 5 (3 prod + 2 dev) |
| Vulnerabilities | 0 (none found) |
| Outdated packages | 1 updated |

## Vulnerabilities

**0 vulnerabilities found.** The dependency tree is clean with no reported security issues across all direct and transitive dependencies.

## Updated Packages

| Package | From | To | Type | Reason |
|---------|------|----|------|--------|
| `@types/node` | 25.8.0 | 25.9.1 | devDependency | Updated via `npm update` within `^25.8.0` semver range |

## Notes

- `@langchain/core` is listed as `MISSING` in `npm outdated` output — this is expected. It is an **optional peer dependency** (`"optional": true` in `peerDependenciesMeta`) and is not required for core functionality.
- All other dependencies (`blessed@0.1.81`, `nanoid@5.1.11`, `typescript@6.0.3`) are up-to-date within their semver ranges.
- No breaking changes were introduced — `npm update` only applied compatible version bumps within declared semver ranges.
