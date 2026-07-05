# IndieHackers Post

## Title
I was spending $800/month on LLM APIs. So I built a router that cut it to $5.

## Body
Hey IH 👋

I kept watching my LLM apps send "what is 2+2?" to GPT-4o at $0.03/query.

That's like calling an Uber to check the mail.

So I built a router that calls multiple providers at the same time and picks the best answer. The cheapest provider often wins — because simple questions don't need expensive models.

It just ranked #1 on RouterArena (the official LLM routing benchmark), beating Microsoft Azure and OpenAI GPT-5.

**The numbers:**

| | A3M Router | GPT-5 | Your current setup |
|---|---|---|---|
| **Score** | **96.77%** | 64.32 | ??? |
| **Cost/1K** | **$0.0768** | $10.02 | Probably $5-10 |
| **Size** | 19.5KB | N/A | N/A |

If you're spending $1,000/month on LLM APIs, this can get you the same quality for ~$5.

**How it works:**

Instead of: Send to GPT-4o → fail → Send to Claude → fail → Send to Groq

It does: Send to all three at once → pick the best answer

Simple queries go to free/cheap providers (Groq, Cerebras). Complex queries go to premium (GPT-4o, Claude). The router figures out which is which.

**Try it:**
```
npx a3m-router route "Explain quantum computing"
```

Auto-detects your API keys. No config needed. 19.5KB install.

**Growth (zero marketing):**
- Day 1: 552 downloads
- Day 2: 320 downloads  
- Day 3: 1,903 downloads (245% growth)
- Now: 6,800+ weekly downloads

**Business model:** Open source (MIT). The savings speak for themselves. Thinking about a hosted version for teams that don't want to manage API keys.

GitHub: https://github.com/Das-rebel/a3m-router

What do you think — is open source + cost savings enough, or should I add a hosted tier?