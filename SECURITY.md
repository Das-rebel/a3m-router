# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible
receiving such patches depend on their current support status:

| Version | Supported          |
| ------- | ------------------ |
| 1.9.x   | :white_check_mark: |
| 1.8.x   | :white_check_mark: |
| < 1.8   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities by emailing us at [Sdas22@gmail.com](mailto:Sdas22@gmail.com).

Please include:
- Description of the vulnerability
- Steps to reproduce (if possible)
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and send a more detailed response
within 72 hours indicating the next steps.

## Security Features

A3M Router includes several security features:

### Input Validation
- Prompt injection detection
- PII (Personally Identifiable Information) detection
- Content filtering
- Rate limiting

### API Security
- No hardcoded API keys
- Environment variable configuration
- Secure credential storage recommendations

### Best Practices
- Regular dependency updates
- Automated security scanning
- Code review for all changes

## Security Measures

We take the following measures to ensure the security of our users:

1. **Dependency Management**: Regular audits of dependencies
2. **Code Review**: All changes reviewed by maintainers
3. **Automated Testing**: Security tests in CI/CD pipeline
4. **Vulnerability Scanning**: Automated scanning for known vulnerabilities

## Responsible Disclosure

We follow responsible disclosure practices:

1. We will acknowledge your report within 48 hours
2. We will provide a timeline for fixes
3. We will credit you in the release notes (unless you prefer anonymity)
4. We will not take legal action against researchers who follow this policy

## Contact

For security-related inquiries, contact:
- Email: Sdas22@gmail.com
- GitHub Security Advisories: [Create an advisory](https://github.com/Das-rebel/adaptive-memory-multi-model-router/security/advisories)
