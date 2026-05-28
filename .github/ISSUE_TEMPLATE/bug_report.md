---
name: Bug Report
about: Report a bug or unexpected behavior to help us improve A3M Router
title: "[Bug] "
labels: bug, needs-triage
assignees: ""
---

## Description

A clear and concise description of the bug.

## Reproduction Steps

Steps to reproduce the behavior:

```bash
# 1. Set up (if applicable)
export PROVIDER_API_KEY=sk-...

# 2. Run
npx a3m-router route "Your query here"
```

If using the SDK, provide a minimal code snippet:

```typescript
import { A3MRouter } from "adaptive-memory-multi-model-router";

const router = new A3MRouter({ /* your config */ });
const result = await router.route("Your query");
```

## Expected Behavior

What did you expect to happen?

## Actual Behavior

What actually happened? Include error messages, stack traces, or unexpected output.

```
Paste error output or logs here
```

## A3M Router Version

- Package: `adaptive-memory-multi-model-router@<version>` (run `npm list adaptive-memory-multi-model-router`)
- CLI version (if applicable): `npx a3m-router --version`

## Environment

- **OS:** macOS / Linux / Windows
- **Node.js version:** (run `node --version`)
- **npm version:** (run `npm --version`)
- **Python version (if using Python SDK):** (run `python --version`)

## Providers Used

Which provider(s) were involved? (e.g., Groq, OpenAI, Anthropic, NVIDIA, DeepSeek, custom)

## Configuration

Attach or describe relevant config (redact API keys):

```json
{
  "providers": { ... },
  "routing": { ... },
  "budgets": { ... }
}
```

## Logs

If you ran with `DEBUG=*` or `LOG_LEVEL=debug`, include relevant log lines:

```
[DEBUG] Routing query...
[ERROR] Provider groq returned 503
```

## Additional Context

- Does this happen consistently or intermittently?
- Does it affect all providers or a specific one?
- Did it work in a previous version? If so, which version?
- Any recent changes to your setup?

## Checklist

- [ ] I have searched existing issues for duplicates
- [ ] I have redacted all API keys and secrets from the above
- [ ] I can reliably reproduce this bug
