# Thread: We Benchmarked Our Own Product

1/
Most AI tools don't publish benchmarks.

If they do, it's cherry-picked. Best case scenarios. GPU clusters you can't afford.

We went the other way.

2/
We ran 200 real API calls using llm-gateway-bench.

Third-party tool. Fresh runs. Real latency. Real cost.

No cherry-picking. Just honest numbers. Here they are:

3/
Direct: 138ms average. Fastest. No routing overhead.

A3M Router (async): 234ms. Adds ~100ms for smart routing.

A3M Router (auto): 374ms. Slower, but handles failures cleanly.

4/
100% success rate across every scenario.

Direct failed on rate limits and 5xx errors.

A3M routed around them. Every time.

5/
The honest take:

Routing adds latency. I'm not going to pretend it doesn't.

But it also saves 62% on costs. That's real money at scale.

6/
You decide what matters more:

- 100ms faster with no fallback
- 100ms slower with auto-recovery and 62% cost savings

For production systems, the choice is clear.

Full benchmark: https://github.com/Das-rebel/adaptive-memory-multi-model-router/blob/main/docs/BENCHMARK.md
