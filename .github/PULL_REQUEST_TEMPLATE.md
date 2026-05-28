## Description

Please include a summary of the change and which issue it fixes. Explain the motivation and context — what problem does this solve and why is this the right approach?

Fixes # (issue)

## Type of Change

Check all that apply:

- [ ] 🐛 **Bug fix** (non-breaking change that fixes an issue)
- [ ] ✨ **New feature** (non-breaking change that adds functionality)
- [ ] 💥 **Breaking change** (fix or feature that would break existing functionality)
- [ ] 📚 **Documentation** (README, API docs, inline comments, or examples)
- [ ] 🎨 **Style** (formatting, code style — no logic change)
- [ ] ⚡ **Performance** (improves speed, memory, or latency without behavior change)
- [ ] 🔒 **Security** (fixes a vulnerability or improves security posture)
- [ ] ♻️ **Refactor** (code change that neither fixes a bug nor adds a feature)
- [ ] 🧪 **Tests** (adds or updates tests, not production code)

## Testing

Describe the tests you ran to verify your changes:

- [ ] All existing tests pass (`npm test`)
- [ ] Added new tests for the changes
- [ ] Tested manually (describe the commands or SDK calls used)
- [ ] Tested with real provider API calls (if applicable)

```bash
# Provide commands to reproduce your testing
node test/some-test.js
npx a3m-router route "Test query"
```

## Checklist

- [ ] My code follows the project's coding style and conventions
- [ ] I have performed a self-review of my own code
- [ ] I have commented complex logic, especially in hard-to-understand areas
- [ ] I have updated the documentation (README, API docs, JSDoc comments) if needed
- [ ] My changes produce no new warnings (no `console.log` left behind, no TypeScript errors)
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes are merged and published in downstream modules
- [ ] I have checked that my changes are backward-compatible (or documented breaking changes)

## Screenshots (if applicable)

If the change affects the terminal UI, dashboard, or any visual output, include screenshots:

| Before | After |
|--------|-------|
| _screenshot_ | _screenshot_ |

## Additional Context

- Related issues or PRs
- Performance impact (latency, memory, bundle size)
- Configuration changes required
- Migration guide (if breaking change)

## Changelog Entry

Suggest a one-line changelog entry for this change:

```
- {type}: {short description} ({issue/PR link})
```

Example: `- feat: add language-based routing override (#42)`
