# A3M Router — Health Report

**Generated:** 2026-05-28  
**Branch:** `main`  
**npm version:** 2.13.22  
**Latest release:** v2.13.20 "SEO fixes, homepage URL, 15 awesome PRs"

---

## 1. Awesome-List Submissions (15 issues)

| # | Repo | Issue | State | Comments | Notes |
|---|------|-------|-------|----------|-------|
| 1 | 12britz/awesome-ai-gateways | #6 | OPEN | 0 | |
| 2 | wauputr4/awesome-llm-gateways | #1 | OPEN | 1 | Author responded to review |
| 3 | pyxis3-ai/awesome-model-agnostic-llm | #2 | OPEN | 0 | |
| 4 | mahseema/awesome-ai-tools | #1404 | OPEN | 0 | |
| 5 | ai-for-developers/awesome-ai-coding-tools | #358 | OPEN | 0 | |
| 6 | WangRongsheng/awesome-LLM-resources | #125 | OPEN | 0 | |
| 7 | tensorchord/Awesome-LLMOps | #523 | OPEN | 0 | |
| 8 | Hannibal046/Awesome-LLM | #611 | OPEN | 0 | |
| 9 | RunaCapital/awesome-oss-alternatives | #352 | OPEN | 0 | Label: enhancement |
| 10 | AiHubCN/Awesome-Chinese-LLM | #101 | OPEN | 0 | |
| 11 | jamesmurdza/awesome-ai-devtools | #584 | **CLOSED** | 1 | Rejected — missing PR template checklist items (auto-closed by bot) |
| 12 | EthicalML/awesome-production-machine-learning | #778 | OPEN | 0 | |
| 13 | reorx/awesome-chatgpt-api | #158 | OPEN | 0 | |
| 14 | Not-Diamond/awesome-ai-model-routing | #15 | OPEN | 0 | |
| 15 | filipecalegario/awesome-generative-ai | #536 | OPEN | 0 | |

**Summary:** 14/15 OPEN, 1 CLOSED (template violation). Only 1 has any reviewer comments (wauputr4). No repo maintainer has merged any entry yet. The closed one (awesome-ai-devtools) can be reopened if the PR description is fixed to match their template.

---

## 2. CI / GitHub Actions

| Workflow | Status | Latest Run |
|----------|--------|------------|
| CI | success | 2026-05-28T04:25:34Z |
| Deploy Pages | success | 2026-05-28T04:25:34Z |
| CodeQL | success | 2026-05-28T04:25:34Z |
| pages-build-deployment | success | 2026-05-28T04:25:32Z |
| stale.yml | **failure** | 2026-05-28T04:25:33Z |

**Stale.yml failure:** The `actions/stale` workflow fails consistently. Root cause: `exempt-issue-labels` and `exempt-pr-labels` are defined **twice** in the config (duplicate keys). GitHub Actions treats duplicate YAML keys as an error. Fix: deduplicate the labels into one `exempt-issue-labels` and one `exempt-pr-labels` entry.

---

## 3. npm Package Metadata

| Field | Value |
|-------|-------|
| **Package** | `adaptive-memory-multi-model-router` |
| **Version** | `2.13.22` |
| **Homepage** | `https://das-rebel.github.io/a3m-router/` |
| **Repository** | `git+https://github.com/Das-rebel/a3m-router.git` |
| **License** | MIT |
| **Engine** | Node >= 18.0.0 |
| **Keywords** | 54 keywords (ai-gateway, llm-router, parallel-llm, ensemble-voting, etc.) |
| **Binaries** | a3m-router, a3m, a3m-tui, adaptive-memory-multi-model-router |
| **Types** | Not set (missing from package.json) |
| **Weekly Downloads** | **5,369** (last week) — Top 0.2% of npm |
| **Total Downloads** | ~10,024 in 14 days |

- `types` field is missing from package.json — consumers using TypeScript won't get automatic type resolution.
- Package name may be too long for convenience; the shorter CLI aliases (`a3m`, `a3m-router`) help.

---

## 4. GitHub Pages

| Check | Status |
|-------|--------|
| HTTPS | OK (200) |
| Content-Type | text/html |
| Size | 19,847 bytes |
| Last-Modified | 2026-05-28 (today) |
| Deploy Workflow | Success on latest run |

**Page is healthy and serving content.**

---

## 5. GitHub Releases

| Tag | Date | Notes |
|-----|------|-------|
| v2.13.20 | 2026-05-28 | **Latest** — SEO fixes, homepage URL, 15 awesome PRs |
| v2.13.18 | 2026-05-27 | 54 npm keywords + HF Space ready |
| v2.14.0 | 2026-05-27 | 10K downloads in 14 days |
| v2.13.3 | 2026-05-26 | Parallel Multi-LLM Execution with Intelligent Merge |

---

## 6. Action Items

### Critical
1. **Fix stale.yml** — Duplicate `exempt-issue-labels`/`exempt-pr-labels` keys cause workflow failure. Merge into single definitions.
2. **Add `types` to package.json** — Currently missing, breaking automatic TypeScript type resolution for consumers.

### Medium
3. **Reopen awesome-ai-devtools PR (#584)** — Edit description to match PR template and re-open. This repo has 2.9K+ visibility.
4. **Check on wauputr4 review** — The only repo with active reviewer feedback. Respond to their comments if any remain.

### Low
5. **Track remaining 14 open submissions** — None have been merged yet. May need follow-up nudges or format adjustments per each repo's rules.

---

## 7. Overall Health Score

| Category | Score | Notes |
|----------|-------|-------|
| CI/CD | 80% | stale.yml broken, others green |
| npm Package | 85% | Missing `types` field |
| GitHub Pages | 100% | Healthy |
| Submissions | 93% | 14/15 open, none merged yet |
| Releases | 100% | Regular cadence |
| **Overall** | **88%** | Good — 2 quick fixes needed |
