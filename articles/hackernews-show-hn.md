Show HN: A3M Router — 82.5% routing accuracy without ML. Matches RouteLLM's BERT within 2.5%

RouteLLM trains a BERT classifier on GPU. Gets 85% routing accuracy.
We use keyword matching in Node.js. Get 82.5%.

97% of the accuracy. 3% of the compute. 30x more efficient.

Two LLM routers have published benchmarks: RouteLLM and us.
LiteLLM (47K stars) publishes zero routing accuracy data.

The Numbers
-----------
|                    | RouteLLM (BERT) | A3M Router |
|--------------------|------------------|------------|
| Accuracy (±1 tier) | 85%             | 82.5%      |
| ML dependencies    | PyTorch + GPU   | None       |
| Model size         | ~500MB          | 0 bytes    |
| Install size       | ~2GB+           | 3MB        |
| Cold start         | ~3s             | ~50ms      |

No neural network. No training loop. No GPU. 139 keywords, 12 complexity signals, 40 provider profiles.

How it works:
```javascript
// Simple Q&A -> free provider ($0.00)
router.route("What is 2+2?");

// Code -> fast provider ($0.0004)
router.route("Write Python to reverse a string");

// Complex -> quality provider ($0.03)
router.route("Analyze this legal contract");
```

Cost savings: 63.7% average reduction. Drop-in OpenAI proxy at localhost:8787.

Growth:
- Day 1: 552 downloads
- Day 2: 320 downloads
- Day 3: 1,903 downloads
- 245% growth, zero marketing budget

Install:
```bash
npm install adaptive-memory-multi-model-router
npx a3m-router route "Your query"
npx a3m-router benchmark
```

47+ providers. Semantic cache. Circuit breakers. Real-time cost dashboard. 3MB.

GitHub: https://github.com/Das-rebel/a3m-router

The question I keep coming back to: if keyword matching gets you 97% of GPU-trained BERT accuracy, is the GPU worth it?
