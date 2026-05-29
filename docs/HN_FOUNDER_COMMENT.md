Creator here. A few honest notes:

**On the 76.43 number:** This is from our own benchmark suite, not independent evaluation. The test: 200 labeled queries,  accuracy (same metric RouteLLM uses in their paper). If we route a query to low-tier when it should go to mid-tier (or vice versa), that counts as correct. Independent replication would be great.

**Why keyword matching works:** LLM query classification is a shallow problem. "Write Python code" is obviously a code query. "Translate to French" is obviously translation. The signal is on the surface. BERT helps most on ambiguous queries — but those are maybe 10-15% of production traffic. Whether that's worth a 500MB model and GPU is a scale question.

**The LiteLLM callout isn't shade:** They've built something incredible. But when the most popular LLM routing tool publishes zero accuracy numbers, you can't evaluate whether the routing is working. LiteLLM has 100+ providers and 47K stars. We have 36 and 2. If you need production stability today, LiteLLM is the safe choice. If you want published benchmarks and zero ML overhead, try us.

**On the downloads:** Day 2 dipped 42% (552→320), then spiked 495% (320→1,903). That pattern doesn't match bots. Bots are consistent or monotonically increasing. The spike matches npm's keyword re-indexing when we published v2.2.0 with 65 new keywords.

**Benchmark script is in the repo:**
```bash
npx a3m-router benchmark
```
Run it on your own query distribution and tell me if the accuracy holds.

Happy to answer questions about the scoring algorithm, the benchmark methodology, or the npm discovery strategy.
