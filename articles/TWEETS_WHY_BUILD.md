# Thread: I Built It Because Nothing Worked

1/
I tried every LLM gateway out there.

Litellm. One-API. All of them.

They all do the same thing: try A, fail, try B, fail, try C.

Sequential fallback. Every single one.

2/
It made no sense to me.

You have 5 providers. You want the fastest answer. So you... wait for each one to fail?

Why not ask all 5 at once and take the winner?

3/
I looked for parallel routing with result merging.

Confidence voting. Weighted ensembles. Auto-healing.

Nothing existed. Either I was missing something, or nobody had built it yet.

4/
So I built it.

Weekend project. Open source from day one. No grand plan.

Just: "I want this to exist, and nobody's made it, so I will."

5/
Put it on GitHub. npm install. That's it.

No VC pitch. No business model. No growth strategy.

Just a tool that does something no other tool does.

6/
The response surprised me:

10K npm downloads in 14 days. PRs from strangers. People actually using it in production.

Turns out I wasn't the only one who wanted this.

7/
Moral of the story:

If every tool in a category does the same thing wrong, build one that does it right.

Open source makes that possible. No permission needed. Just ship.

GitHub: https://github.com/Das-rebel/adaptive-memory-multi-model-router
