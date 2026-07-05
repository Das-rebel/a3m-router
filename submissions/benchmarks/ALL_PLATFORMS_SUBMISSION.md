# A3M Router - All Platform Submissions Status

## Summary
- **npm:** adaptive-memory-multi-model-router@2.14.58
- **GitHub:** https://github.com/Das-rebel/a3m-router
- **Total Downloads:** 24,314
- **Weekly Downloads:** 3,208

---

## ✅ Submitted & Merged

| Benchmark | Venue | Status | PR |
|----------|-------|--------|-----|
| **RouterEval** | EMNLP 2025 | ✅ **MERGED** | [#4](https://github.com/MilkThink-Lab/RouterEval/pull/4) |

---

## 📊 RouterArena Performance

| Mode | Score | Accuracy | Robustness | Cost |
|------|-------|----------|------------|------|
| **Premium** (PR #144) | 0.9404 | 96.77% | 1.0000 | $0.0768/1K |
| **Free-tier** (PR #152) | 0.5234 | 50.59% | 0.0000 | $0.038/1K |

### PR #152 - OPEN
- **Status:** Awaiting evaluation
- **Comment:** Posted follow-up on PR asking about free-tier classification
- **PR:** https://github.com/RouteWorks/RouterArena/pull/152

---

## 📊 LLMRouterBench (ACL 2026) - PR #3 - OPEN
- **Status:** Comment posted on PR
- **PR:** https://github.com/ynulihao/LLMRouterBench/pull/3
- **Added:** baselines/A3MRouter/

---

## 📊 routerbench (ICML Workshop) - PR #14 - OPEN
- **Status:** Awaiting comment (auth issue)
- **PR:** https://github.com/withmartian/routerbench/pull/14
- **Added:** routers/a3m_router.py

---

## 📊 MMR-Bench (ArXiv 2026) - PR #4 - OPEN
- **Status:** Awaiting review
- **PR:** https://github.com/Hunter-Wrynn/MMR-Bench/pull/4
- **Focus:** Multimodal LLM routing

---

## Local Benchmark Results

| Metric | Value |
|--------|-------|
| Exact Tier Match | **67%** |
| ±1 Tier Accuracy | **96%** |
| Cost Savings | **62.9%** |
| Robustness Score | **0.8524** |

---

## Documentation Created

- `articles/SHOW_HN_V2.md` - HN/Reddit-ready blog post
- `articles/BENCHMARK_MAINTAINER_OUTREACH.md` - Email templates for maintainers

---

## Version History
- v2.14.58 - Added timeout_ms to reliability, npm stats update
- v2.14.57 - Fixed auto-publish CI abuse detection
- v2.14.41 - Enhanced Shapley + Multi-Round Dialog
- v2.14.23 - Research-backed routing improvements
