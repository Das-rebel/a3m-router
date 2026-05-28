---
name: Feature Request
about: Suggest an idea or enhancement for A3M Router
title: "[Feature] "
labels: enhancement
assignees: ""
---

## Problem Statement

A clear description of the problem you're trying to solve. What gap or pain point does this feature address?

**Example:** "Currently, A3M Router doesn't support routing based on response language. When I send multilingual queries, I want them routed to providers that perform best in that language."

## Proposed Solution

Describe the feature you'd like to see. Be as specific as possible about behavior, configuration, and API.

```typescript
// If applicable, sketch the API you envision
const router = new A3MRouter({
  languageRouting: {
    enabled: true,
    defaultProvider: "openai",
    languageOverrides: {
      ja: "anthropic",
      zh: "deepseek",
    },
  },
});
```

## Use Case

Describe the real-world scenario that would benefit from this feature.

- Who is the target user? (e.g., solo developer, enterprise team, researcher)
- What workflow does it enable or simplify?
- How frequently would this be used?

## Alternatives Considered

List any workarounds or alternative approaches you've explored:

1. Manual provider selection per query
2. Custom wrapper script
3. Forking and modifying the router
4. Using a different tool altogether

Explain why these are insufficient.

## Priority

How important is this to you?

- [ ] **Blocking** — Cannot proceed without this feature
- [ ] **High** — Important for my workflow
- [ ] **Medium** — Nice to have
- [ ] **Low** — Interesting idea, not urgent

## Would You Implement It?

- [ ] **Yes** — I can submit a PR (with guidance)
- [ ] **Maybe** — Willing to help test or provide requirements
- [ ] **No** — Just suggesting

## Additional Context

- Links to related discussions, issues, or external references
- Screenshots or mockups (if applicable)
- Any constraints or requirements (e.g., must work offline, must not increase bundle size)
