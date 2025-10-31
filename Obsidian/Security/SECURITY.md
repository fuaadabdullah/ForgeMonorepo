# Security Policy

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### Private Disclosure

Send vulnerability reports to: **[Your security email or GitHub Security Advisory]**

You can also use GitHub's private vulnerability reporting:
1. Go to the **Security** tab
2. Click **Report a vulnerability**
3. Fill out the form

### What to Include

Please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** and attack scenarios
- **Affected versions**
- **Any potential fixes** you've identified (if applicable)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity (see below)

### Severity Levels

| Severity | Examples | Fix Timeline |
|----------|----------|--------------|
| **Critical** | RCE, authentication bypass, secret exposure | 1-3 days |
| **High** | Privilege escalation, SQL injection, XSS | 7 days |
| **Medium** | CSRF, information disclosure | 30 days |
| **Low** | Minor information leaks, DoS | 60 days |

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Active support  |
| 0.x.x   | ⚠️ Best effort     |
| < 0.5   | ❌ No longer supported |

## Security Best Practices

When using GoblinOS:

1. **Keep dependencies updated**: Run `pnpm update` regularly
2. **Use latest LTS Node.js**: Version 22 (see `.nvmrc`)
3. **Enable 2FA**: For npm publishing and GitHub access
4. **Review changelogs**: Before upgrading, check [CHANGELOG.md](./CHANGELOG.md)
5. **Run security scans**: `pnpm audit` and GitHub's Dependabot alerts

## Security Features

GoblinOS implements:

- ✅ **npm provenance** for published packages (cryptographic attestations)
- ✅ **CodeQL scanning** for static analysis
- ✅ **OpenSSF Scorecard** for repository health
- ✅ **SBOM generation** (CycloneDX and SPDX formats)
- ✅ **Renovate** for automated dependency updates
- ✅ **Lefthook** for pre-commit secret scanning

## Acknowledgments

We appreciate responsible disclosure. Security researchers who report valid vulnerabilities will be:

- **Acknowledged** in release notes (with permission)
- **Notified** when the fix is released
- **Credited** in our security hall of fame (coming soon)

## PGP Key (Optional)

For encrypted communications:

```
[Your PGP public key block, if applicable]
```

---

**Last updated**: 2025-01-XX
**Contact**: [Maintainer email or GitHub handle]
