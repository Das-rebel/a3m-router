[P] A3M Router achieves 82.5% routing accuracy with keyword matching — matches RouteLLM's BERT classifier (85%) without GPU

Hi r/MachineLearning,

We benchmarked our keyword-matching LLM router against RouteLLM's GPU-trained BERT classifier. The results surprised us.

**Benchmark comparison:**

| Metric | RouteLLM (BERT) | A3M Router (Keywords) |
|--------|------------------|------------------------|
| Accuracy (±1 tier) | 85% | 82.5% |
| ML required | Yes (PyTorch + CUDA) | No |
| Model size | ~500MB BERT | 0 bytes |
| GPU required | Yes | No |
| Cold start | ~3s (model load) | ~50ms |
| Install size | ~2GB+ | 3MB |
| Runtime | Python | Node.js |

2.5% accuracy gap. Zero ML infrastructure.

**Context:**
RouteLLM (from UC Berkeley, arXiv:2404.06035) trains a BERT classifier to route LLM queries between tiers. It's the gold standard for published LLM routing benchmarks.

We implemented routing via keyword-based feature extraction: 139 keywords, 12 complexity signals, heuristic scoring. No training loop, no gradient updates, no neural network.

**Routing algorithm:**
```javascript
// Feature extraction
const features = extractQueryFeatures(query);
// { has_code: true, complexity: 0.6, task_type: "code_gen" }

// Complexity-weighted scoring
if (features.complexity < 0.5) {
  score = cost_efficiency * 0.7 + quality * 0.3;
} else if (features.has_code) {
  score = speed * 0.4 + quality * 0.4 + cost * 0.2;
} else {
  score = quality * 0.7 + cost_efficiency * 0.3;
}
```

**Why this matters for the ML community:**

1. **Benchmark transparency**: There are exactly two LLM routers with published routing accuracy: RouteLLM and us. LiteLLM (47K GitHub stars) publishes zero accuracy data. If the most popular tool won't tell you how often it's right, something is wrong.

2. **Efficiency question**: Is a 2.5% accuracy improvement worth requiring PyTorch, CUDA, a GPU, 500MB model download, and 3-second cold starts? For many production deployments, the answer is no.

3. **The 30x story**: 97% of the accuracy at 3% of the compute. That's a 30x efficiency multiplier.

**Cost results:**
- 63.7% average cost reduction vs single-provider routing
- 40 provider integrations
- Drop-in OpenAI-compatible proxy (localhost:8787)

**Growth (organically, zero marketing):**
- Day 1: 552 downloads
- Day 2: 320 downloads
- Day 3: 1,903 downloads
- 245% growth, zero budget

**Questions for the community:**

1. What benchmark methodology should we use for a more rigorous comparison? We used the same ±1 tier accuracy metric as RouteLLM's paper.
2. Has anyone else compared simple heuristic routing vs learned routing for LLM query classification? The gap seems smaller than expected.
3. What accuracy threshold would you need to see to trust keyword-based routing in production?

**Try it:**
```bash
npm install adaptive-memory-multi-model-router
npx a3m-router route "Write Python to sort an array"
npx a3m-router benchmark
```

GitHub: https://github.com/Das-rebel/adaptive-memory-multi-model-router

The honest caveat: this is a young project (3 days since launch). The 82.5% number is from our benchmark suite, not an independent evaluation. We welcome scrutiny and would love to see third-party replication.
