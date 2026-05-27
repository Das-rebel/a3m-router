1/7 Three LLM infrastructure problems that keep coming up:

• Your bill is 3x higher than it needs to be  
• Sequential fallback gives you one answer, never the best  
• Every gateway says "negligible overhead" — zero data  

We built the thing that fixes all three.

2/7 A dev on X: "Cancelled both my Claude Code Pro and ChatGPT Pro. Kimi K2.6 is just as good for side projects. Price is crazy low."

Another: "Vectorized 27K notes for $0.07. That's pretty amazing."

Everyone's looking for cheaper options. The hard part is doing it per-query without wasting time.

We route every query to the cheapest capable model. 62% savings. Measured.

3/7 Every LLM "router" does: try A → fail → try B → fail → try C.

You always get whatever A gave you. Nobody runs them all and picks the best.

Someone already built `ai-retry` just for the fallback part — that's how common this pain is.

We run all providers in parallel. Score results. Return the best answer. With reasoning why it won.

4/7 "Negligible overhead" — every gateway claims this. Zero publish numbers.

We ran ours through llm-gateway-bench (third-party, not our tool) and published everything.

Direct: 138ms  
Through A3M: 374ms

236ms overhead. Real. Documented. Runs 62% cheaper.

5/7 The numbers since we shipped:  
10,024 downloads in 14 days.  
72 versions.  
Zero marketing.  
47 providers.  
19.5 KB.  
Zero ML dependencies.

6/7 npm install adaptive-memory-multi-model-router  
npx a3m-router serve

Point any OpenAI SDK at localhost:8787. Works.

7/7 GitHub: github.com/Das-rebel/a3m-router  
Benchmarks: third-party via llm-gateway-bench 

Built because the existing stuff didn't fix the actual problems.
