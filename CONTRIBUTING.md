# Contributing to A3M Router

Thanks for helping build the fastest-growing open-source LLM router! 🚀

## Quick Setup

```bash
git clone https://github.com/Das-rebel/a3m-router.git
cd a3m-router
npm install
npm run build
```

## Project Structure

```
src/
├── providers/     # 47+ LLM provider configurations
├── routing/       # UCB1 + MCTS routing engine
├── cache/         # Semantic deduplication cache
├── proxy/         # OpenAI-compatible proxy server
└── tui/           # Terminal UI overlay
```

## Development

```bash
npm run build      # Compile TypeScript
npm test           # Run tests
node dist/tui/dashboard.js  # Launch TUI
```

## PR Guidelines

- Keep the package under 20KB (no ML deps)
- Add provider configs in `src/providers/`
- Route logic in `src/routing/`
- TUI changes in `src/tui/`
- Update CHANGELOG.md

## Adding a Provider

1. Add config in `src/providers/providerConfig.ts`
2. Set tier: `free` / `cheap` / `mid` / `premium`
3. Add to `PROVIDER_TIERS` map
4. PR with latency benchmarks

## Questions?

Open an issue or reach out on [GitHub Discussions](https://github.com/Das-rebel/a3m-router/discussions).
