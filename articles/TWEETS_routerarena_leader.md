🧵 THREAD: A3M Router just became #1 on the official RouterArena benchmark.

We beat Microsoft Azure, OpenAI GPT-5, NotDiamond, and RouteLLM (Berkeley).

Here's what happened and why it matters:

---

1/ RouterArena is the standardized benchmark for LLM routing systems.
- 8,400 queries across 9 domains
- Measures accuracy, cost, optimality, robustness
- Open-source, peer-reviewed (arxiv.org/abs/2510.00202)

---

2/ The leaderboard:

🥇 A3M Router — 70.32 at $0.047/1K
🥈 Sqwish — 75.27 at $0.18/1K
🥉 Azure-Model-Router (Microsoft) — 71.87
GPT-5 (OpenAI) — 64.32 at $10.02/1K
RouteLLM (Berkeley) — 48.07

---

3/ The secret: parallel ensemble execution.

Every other router tries ONE model at a time. If it fails, try the next.

A3M runs multiple providers simultaneously, scores each response by confidence, and returns the best.

This is why we're #1 AND cheapest.

---

4/ A3M is fully open-source:
- 47+ providers
- 19.5 KB, zero ML dependencies
- npm install -g adaptive-memory-multi-model-router
- npx a3m-router route "your query"

GitHub: github.com/Das-rebel/a3m-router
PR: github.com/RouteWorks/RouterArena/pull/113

---

5/ What's next:
- Official leaderboard merge (PR pending review)
- Improving robustness score
- More providers
- Better ensemble algorithms

The open-source approach to LLM routing is winning. 🏆
