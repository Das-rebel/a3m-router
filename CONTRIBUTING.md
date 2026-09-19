# Contributing to A3M Router

Thanks for helping build the open-source LLM router! 🚀

## Quick Setup

```bash
git clone https://github.com/Das-rebel/a3m-router.git
cd a3m-router
npm install
npm run build
```

## Running Tests

```bash
# All tests
npm test                    # or: npx vitest run tests/

# Routing engine tests
npx vitest run tests/routing/

# Jev engine tests
npx vitest run tests/routing/jev.test.ts

# Provider tests
node test/provider-test.js

# Quick smoke test
node test.js
```

## Project Structure

```
src/
├── routing/
│   ├── advancedRouter.ts    # Main heuristic router (System 2)
│   ├── jev/                 # Jev System One decision head
│   │   ├── jevRouter.ts     # Entry point
│   │   ├── optionAttention.ts # Single-pass option-attention math
│   │   ├── weights/          # Trained weights (git-tracked dist/)
│   │   └── types.ts
│   └── routeQuery.ts        # Provider scoring + selection
├── providers/
│   └── providerConfig.ts   # 80+ provider configs + tier definitions
├── server/
│   ├── modelMapper.ts      # model="auto" / model="jev-auto" dispatcher
│   └── proxyServer.ts      # OpenAI-compatible proxy server
├── cache/
│   └── semanticCache.ts    # Embedding-based deduplication
└── cli.ts                  # CLI entry point

tests/
├── routing/jev.test.ts      # Jev engine unit tests
├── routing/advancedRouter.test.ts
└── integration/
```

## Adding a New Provider

1. Add the provider config to `src/providers/providerConfig.ts`:
   ```typescript
   export const MY_PROVIDER: Provider = {
     name: "my-provider",
     apiKeyEnvVar: "MY_PROVIDER_API_KEY",
     endpoint: "https://api.my-provider.ai/v1",
     supports: ["chat", "Completions"],
     tier: "cheap",  // free | cheap | mid | premium
     region: "us-east",
   };
   ```

2. Add to the provider registry:
   ```typescript
   export const PROVIDERS: Record<string, Provider> = {
     // ...existing
     "my-provider": MY_PROVIDER,
   };
   ```

3. Run tests:
   ```bash
   node test/provider-test.js   # basic connectivity
   npx a3m-router providers list  # verify it appears
   ```

## Adding a Routing Engine (e.g., a new Jev variant)

1. Create `src/routing/myEngine/`
2. Implement the engine interface:
   ```typescript
   export interface RouteResult {
     primary_model: string;     // "provider/model-name"
     confidence: number;        // 0–1
    备选?: string;            // fallback provider/model
   }
   export function routeQuery(prompt: string): RouteResult { ... }
   ```
3. Wire it into `src/server/modelMapper.ts` under the new model name
4. Add tests in `tests/routing/myEngine.test.ts`
5. Document in this README under "Two Routing Modes"

## Code Style

- **TypeScript strict mode** — no `any`, full type coverage
- **ES2022** target, CommonJS output
- 2-space indent, single quotes
- Run `npx tsc --noEmit` before committing

## Commit Conventions

```
feat(provider): add Cloudflare Workers AI support
fix(jev): guard against empty option set
chore: bump vitest to 3.x
docs: rewrite Quick Start section
```

## Pull Request Checklist

- [ ] `npm run build` passes locally
- [ ] `npx vitest run tests/` — all tests green
- [ ] `node test.js` — smoke test passes
- [ ] New provider/engine has tests
- [ ] README updated if adding new features

---

## Getting Help

- 💬 [GitHub Discussions](https://github.com/Das-rebel/a3m-router/discussions)
- 🐛 [Issue Tracker](https://github.com/Das-rebel/a3m-router/issues)
- 📖 [docs/](docs/) for architecture and API reference
