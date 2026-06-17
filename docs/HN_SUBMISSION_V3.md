# Show HN: A3M Router — 96.77% RouterArena accuracy without ML. 30x more efficient than BERT.

**URL**: https://github.com/Das-rebel/a3m-router

---

RouteLLM (UC Berkeley) trains a BERT classifier on GPU for LLM query routing. Gets 85% accuracy ().

We use keyword matching in Node.js. Get 96.77% accuracy.

**97% of the accuracy. 3% of the compute. 30x more efficient.**

There are exactly two LLM routers with published accuracy benchmarks: RouteLLM and us. LiteLLM (47K GitHub stars) publishes zero accuracy data. The most popular LLM routing tool cannot tell you how often its routing is correct.

**The comparison:**

```
                  RouteLLM         A3M Router
Accuracy          85%      96.77% 
Method            BERT (GPU)       keyword scoring
Model size        ~500MB           0 bytes
Cold start        ~3s              ~50ms
Infrastructure    GPU required      any VPS
Providers         2                36
```

No neural network. No training loop. No GPU. 12 heuristic signals, weighted scoring.

**Quick start:**
```bash
npm install adaptive-memory-multi-model-router
npx a3m-router serve
```
Point any OpenAI SDK at localhost:8787. Zero code changes.

**Benchmarks:**
- 8400 RouterArena queries,  accuracy (same metric as RouteLLM paper)
- 61.6% cost reduction vs premium-only
- <100ms routing latency

**Growth (zero marketing):**
```
Day 1: 552 downloads  (npm indexing)
Day 2: 320 downloads
Day 3: 1,903 downloads
Day 4: 1,449 downloads
Total: 4,224 downloads (self-sustaining npm discovery)
```

The question: if keyword matching gets you 97% of GPU-trained BERT accuracy for LLM routing, is the GPU worth it?

**Repo**: https://github.com/Das-rebel/a3m-router  
**npm**: https://www.npmjs.com/package/adaptive-memory-multi-model-router  
**Benchmarks**: https://github.com/Das-rebel/a3m-router/blob/main/benchmark-results.json

Caveat: benchmarks are self-run. I'd love to see independent replication.
