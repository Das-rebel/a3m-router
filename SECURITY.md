# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | ✅ |
| < 2.0   | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in A3M Router:

1. **Do NOT** open a public issue
2. Email: security@das-rebel.dev (or DM on GitHub)
3. Include: description, steps to reproduce, potential impact
4. We will respond within 48 hours

## Security Features

A3M Router includes built-in security features:
- **Prompt injection detection**: 17 patterns detected automatically
- **PII redaction**: Automatic redaction of personally identifiable information
- **Content filtering**: Configurable content guardrails
- **Input sanitization**: All inputs validated before routing

## Scope

This policy applies to the A3M Router core package only. Third-party providers (OpenAI, Anthropic, etc.) have their own security policies.
