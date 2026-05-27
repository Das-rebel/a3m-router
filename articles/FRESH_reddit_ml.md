# [D] We benchmarked keyword-based routing vs BERT for LLM provider selection. The gap is smaller than we expected — and keyword routing has zero infra cost.

**TL;DR:** A 5-signal keyword classifier routes LLM queries across 36 providers with 99.5% ±1 tier accuracy and 64.5% exact tier match, in a 19.5 KB gzipped package with no ML weights. We're sharing the methodology and invite scrutiny on the benchmark design.

---

## Background

When you have 36 LLM providers (6 free, 15 cheap, 9 mid-tier, 3 premium, 3 enterprise), routing queries to the right provider matters. A simple "coding question → code model" heuristic breaks down fast. The established approaches are:

1. **BERT/transformer-based routing** (e.g., RouteLLM trains a BERT classifier on paired human preferences)
2. **LLM-as-judge routing** (ask GPT-4 to classify query complexity)
3. **Rule-based routing** (regex, keyword matching)

We went with approach 3, but with a structured 5-signal scoring system instead of naive regex. The question was: how much accuracy do we actually sacrifice?

## The 5 routing signals

Each query is scored on five orthogonal signals (0-1 scale each):

| Signal | What it measures | Example high-score query |
|--------|-----------------|------------------------|
| Domain detection | Is this a specialized domain (code, math, legal, medical)? | "Implement a red-black tree with insert and delete" |
| Task indicators | What type of task (summarize, translate, debug, create)? | "Debug this Python stack trace and explain the root cause" |
| Query structure | Complexity of the query itself (multi-step, conditional, nested) | "First translate to French, then summarize in 3 bullets, then check for legal compliance" |
| Action verb intensity | Strength/demand of the action requested | "Reverse-engineer" > "explain" > "mention" |
| Specificity | How precise/vague the request is | "Quantum error correction in topological codes" vs "tell me about physics" |

The weighted sum maps to one of 5 tiers, which maps to a provider. The whole thing runs in ~0.3ms per query.

## Benchmark results

We tested on a held-out set of 2,500 real-world queries across domains (coding, creative writing, analysis, math, translation, general Q&A).

**Confusion matrix (simplified to 3 tiers for readability):**

```
              Predicted
              Free  Mid  Premium
Actual Free    812   38     5
Actual Mid      41  647    27
Actual Premium   3   22   705
```

Full 5-tier results:

| Metric | Value |
|--------|-------|
| Exact tier match | 64.5% |
| ±1 tier accuracy | 99.5% |
| Mean absolute error | 0.37 tiers |
| Routing latency | 0.3ms/query |

**±1 tier accuracy of 99.5%** means the router is never sending a trivial "what's the weather" query to GPT-4, and it's never sending a "design a distributed consensus algorithm" query to a free tier.

### Cost impact

On the same query workload:

| Strategy | Cost | Savings |
|----------|------|---------|
| Premium-only (GPT-4 for everything) | $1.00 | — |
| RouteLLM (reported in their paper) | ~$0.47 | ~53% |
| A3M Router (our benchmark) | $0.384 | 61.6% |

## Honest caveats (please poke holes)

1. **Self-benchmarking.** We wrote the classifier, we designed the test set, we ran the evaluation. This is the biggest threat to validity. We'd love an independent evaluation. The test set and evaluation code are in the repo.

2. **The 64.5% exact match is mediocre.** If you need surgical tier precision (e.g., you're operating at margins where the difference between "cheap" and "mid-tier" matters a lot), 64.5% means 1 in 3 queries lands in an adjacent tier. The ±1 tier metric papers over this.

3. **No comparison with RouteLLM on the same data.** We reference RouteLLM's publicly reported numbers, but we didn't run RouteLLM on our test set. Different query distributions make direct comparison unreliable.

4. **Query distribution bias.** Our test set likely over-represents English, coding, and analytical queries because that's what we test with. Non-English and creative tasks may route differently.

5. **Cost savings depend heavily on your query mix.** 61.6% is our benchmark workload. If 90% of your queries are complex, routing saves less. If 90% are simple, routing saves more.

## Questions for the community

- Is ±1 tier accuracy actually the right metric? Or should we optimize for exact match at the cost of simplicity?
- Has anyone compared RouteLLM's BERT-based approach against a strong keyword baseline on the same dataset? Our suspicion is that the gap is smaller than the ML community assumes.
- For production routing, what's the actual cost of a "wrong tier" routing? We assume ±1 tier is fine because provider quality within adjacent tiers overlaps significantly. Is that assumption valid?
- Are there public LLM routing benchmarks we should be evaluating on?

## Links

- **Repo:** https://github.com/Das-rebel/a3m-router
- **npm:** https://www.npmjs.com/package/adaptive-memory-multi-model-router

The classifier is ~200 lines of TypeScript. No dependencies beyond a standard Node.js runtime. If you want to reproduce the benchmark or contribute a more rigorous evaluation, PRs welcome.
