Title: Show HN: A3M Router — #1 on RouterArena, open-source LLM router

We built an open-source LLM router at https://github.com/Das-rebel/a3m-router and it just scored #1 on the official RouterArena benchmark (96.77%) — beating Microsoft Azure (71.87), OpenAI GPT-5 (64.32), and every other commercial and academic router.

The secret: parallel multi-LLM execution. Every other router does sequential model selection (try model A, if it fails try B). A3M runs providers simultaneously and scores results by confidence — so you get the best answer with zero sequential latency.

RouterArena results:
- A3M Router: 96.77% at $0.0768/1K queries  
- Sqwish (#2): 75.27 at $0.18/1K (4x more expensive)
- Azure-Model-Router: 71.87
- NotDiamond: 57.29
- RouteLLM (Berkeley): 48.07

Also fully open-source — run it yourself:
  npx a3m-router route "your query"

Documentation + benchmark: https://das-rebel.github.io/a3m-router/
