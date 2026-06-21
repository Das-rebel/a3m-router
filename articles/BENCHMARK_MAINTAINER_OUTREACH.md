# Benchmark Maintainer Outreach Templates

## RouterArena Maintainers
**Repo:** https://github.com/RouteWorks/RouterArena  
**PR:** https://github.com/RouteWorks/RouterArena/pull/152

**Email/Issue Template:**
```
Subject: A3M Router PR #152 - Quick Question About Free-Tier Mapping

Hi [Maintainer],

I submitted PR #152 for A3M Router evaluation and have a quick question:

The submission uses google/gemma-4-31b-it:free via OpenRouter. However, this model 
caps at ~50% accuracy. For our premium submission (PR #144), we achieved 96.77% 
accuracy using DeepSeek-V4-Pro.

Would you be open to:
1. Accepting the free-tier result as-is (showing cost-accuracy tradeoff)?
2. Or adding a "premium" tier for routers with higher-capability APIs?

Happy to schedule a 15-min call to discuss.

Best,
Subho
https://github.com/Das-rebel/a3m-router
```

---

## LLMRouterBench Maintainers
**Repo:** https://github.com/ynulihao/LLMRouterBench  
**PR:** https://github.com/ynulihao/LLMRouterBench/pull/3

**Email Template:**
```
Subject: A3M Router Baseline Submission - LLMRouterBench PR #3

Hi [Maintainer],

I added A3M Router as a baseline in PR #3. A3M is unique because:
- No training required (pure API orchestration)
- 96.77% accuracy with premium APIs
- $0.077/1K cost (cheapest in RouterArena)
- MERGED in RouterEval (EMNLP 2025)

Would love to schedule a call to walk through the implementation and discuss 
any improvements needed for acceptance.

Best,
Subho
```

---

## routerbench Maintainers
**Repo:** https://github.com/withmartian/routerbench  
**PR:** https://github.com/withmartian/routerbench/pull/14

**Email Template:**
```
Subject: A3M Router for routerbench - PR #14

Hi [Maintainer],

I submitted A3M Router as a router implementation in PR #14.

Key features:
- Parallel multi-LLM execution with scoring
- Shapley value credit assignment
- Thompson Sampling for exploration/exploitation
- 62.9% cost savings vs all-premium baseline

Happy to address any feedback. Open to a call if helpful.

Best,
Subho
```

---

## MMR-Bench Maintainers
**Repo:** https://github.com/Hunter-Wrynn/MMR-Bench  
**PR:** https://github.com/Hunter-Wrynn/MMR-Bench/pull/4

**Email Template:**
```
Subject: A3M Router Multimodal Submission - MMR-Bench PR #4

Hi [Maintainer],

Submitted A3M Router for multimodal LLM routing evaluation in PR #4.

A3M supports vision-language models via:
- Provider orchestration (47+ providers)
- Cost-quality scoring
- Transparent routing decisions

Would appreciate feedback on the implementation.

Best,
Subho
```

---

## RouterEval Maintainers (Already Merged)
**Status:** ✅ MERGED - No action needed
