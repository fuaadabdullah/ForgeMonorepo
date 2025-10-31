# Environment & Secrets Management

## Overview

The ForgeMonorepo implements a comprehensive secrets management system using Smithy (the Forge Guild environment goblin) for secure, validated environment configuration across all services.

## Architecture

### Smithy Environment Validator

The `smithy env_validate` command provides comprehensive validation of environment variables and secrets across all services:

- **Service-specific validation**: Validates required and optional keys for each service
- **Format validation**: Checks API key formats, URLs, and other structured values
- **Documentation sync**: Ensures `.env.example` files match actual configurations
- **CI integration**: Generates reports for automated validation in CI/CD pipelines

### Secrets Backends

Smithy supports multiple secrets storage backends with priority lookup:

1. **Environment Variables** (highest priority)
2. **System Keyring** (macOS Keychain, Windows Credential Manager)
3. **JSON File Vault** (encrypted local storage)

### Supported Services

| Service | Location | Required Keys | Optional Keys |
|---------|----------|---------------|---------------|
| **forgetm** | `ForgeTM/.env.example` | GEMINI_API_KEY_FORGETM, GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, POLYGON_API_KEY, LITELLM_API_KEY | BACKEND_HOST, BACKEND_PORT, DATABASE_URL, REDIS_URL |
| **forgetm-backend** | `ForgeTM/apps/backend/.env.example` | Same as forgetm | Same as forgetm + SECRET_KEY |
| **goblinos** | `GoblinOS/.env.example` | GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, POLYGON_API_KEY, LITELLM_API_KEY | OLLAMA_BASE_URL, OLLAMA_DEFAULT_MODEL |
| **overmind** | `GoblinOS/packages/goblins/overmind/.env.example` | GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY | OLLAMA_BASE_URL, OLLAMA_DEFAULT_MODEL, OVERMIND_BRIDGE_PORT |

## Commands

### Validation

```bash
# Validate all services
smithy env_validate

# Validate specific service
smithy env_validate forgetm

# Generate CI report
smithy env_report
```

### Synchronization

```bash
# Sync all .env.example files with available secrets
smithy env_sync

# Sync specific services
smithy env_sync forgetm goblinos
```

### Secrets Management

```bash
# List all secrets (redacted)
smithy secrets list

# Get specific secret value
smithy secrets get OPENAI_API_KEY

# Set secret value
smithy secrets set OPENAI_API_KEY "sk-proj-..."

# Sync secrets to .env file
smithy secrets sync-env .env --keys OPENAI_API_KEY,GEMINI_API_KEY
```

## CI/CD Integration

### Environment Validation Workflow

The `env-validation.yml` workflow runs on:

- **Pull Requests**: When `.env.example` files or validation code changes
- **Pushes**: To main/release branches
- **Daily Schedule**: Automated validation at 3 AM UTC
- **Manual Trigger**: Via GitHub Actions dispatch

### Validation Checks

The workflow performs:

1. **Environment validation** using Smithy validator
2. **Report generation** with detailed error/warning breakdown
3. **Artifact upload** for validation reports
4. **Slack notifications** on failures and nightly success
5. **Auto-sync PR creation** for outdated `.env.example` files

### PR Validation Gates

Environment validation is required for:

- Changes to `.env.example` files
- Secrets configuration updates
- Smithy validation code changes
- CI workflow modifications

## Usage Examples

### Setting Up Development Environment

```bash
# 1. Bootstrap development environment
smithy bootstrap

# 2. Validate current environment setup
smithy env_validate

# 3. Sync any missing .env.example entries
smithy env_sync

# 4. Set up secrets (if needed)
smithy secrets set OPENAI_API_KEY "your-key-here"
smithy secrets sync-env .env --keys OPENAI_API_KEY
```

### CI/CD Validation

```bash
# Run validation in CI
smithy env_report

# Check specific service
smithy env_validate forgetm-backend

# Validate before deployment
smithy env_validate && echo "✅ Ready for deployment"
```

### Secrets Rotation

```bash
# 1. Update secret value
smithy secrets set GEMINI_API_KEY "new-key-value"

# 2. Sync to environment files
smithy secrets sync-env .env --keys GEMINI_API_KEY

# 3. Validate configuration
smithy env_validate

# 4. Update .env.example if needed
smithy env_sync
```

## Security Practices

### API Key Management

- **Never commit** actual API keys to version control
- **Use environment variables** for production deployments
- **Document requirements** in `.env.example` files
- **Rotate keys regularly** (target: every 90 days)

### Environment Files

- **`.env`** - Actual values (never committed, added to `.gitignore`)
- **`.env.example`** - Templates with placeholder values (committed)
- **`.credentials.vault`** - Encrypted secrets vault (never committed)

### Validation Rules

The validator checks for:

- **Required keys present** in `.env.example` files
- **Valid formats** for API keys, URLs, and structured values
- **Documentation completeness** between `.env` and `.env.example`
- **Placeholder values** not used in production configurations

## Troubleshooting

### Common Issues

#### Missing .env.example File

```
❌ .env.example file not found: ForgeTM/.env.example
```

**Solution**: Create the missing `.env.example` file with required environment variables.

#### Invalid API Key Format

```
⚠️ Key 'OPENAI_API_KEY' does not appear to be a valid API key format
```

**Solution**: Verify the API key format with the provider's documentation.

#### Undocumented Environment Variables

```
⚠️ Key 'CUSTOM_VAR' found in .env but not documented in .env.example
```

**Solution**: Add the variable to `.env.example` or remove from `.env`.

### Validation Errors

#### Critical Errors (Block CI)

- Missing required environment variables
- Invalid URL formats
- Missing `.env.example` files

#### Warnings (Allow CI but notify)

- Invalid API key formats
- Undocumented environment variables
- Placeholder values in production

### Recovery Steps

1. **Check validation report** from CI artifacts
2. **Run local validation**: `smithy env_validate`
3. **Fix identified issues** based on error messages
4. **Sync examples**: `smithy env_sync`
5. **Re-run validation** to confirm fixes

## Integration with Other Systems

### Smithy Commands

Environment validation integrates with other Smithy commands:

```bash
# Full repo check including environment validation
smithy check

# Environment diagnostics
smithy doctor

# Code quality + environment validation
smithy biome-check && smithy env_validate
```

### GitHub Actions

The validation workflow integrates with:

- **PR checks**: Automatic validation on environment changes
- **Branch protection**: Required status checks
- **Slack notifications**: Real-time alerts for validation failures
- **Artifact storage**: Detailed validation reports

### Development Workflow

```bash
# Development workflow with validation
smithy bootstrap          # Set up environment
smithy env_validate       # Validate configuration
smithy biome-check        # Code quality
smithy check             # Full validation suite
```

## Future Enhancements

### Planned Features

- **Secrets rotation tracking** with expiration dates
- **Multi-environment support** (dev/staging/prod)
- **Audit logging** for secrets access
- **Automated rotation** based on age policies
- **Integration with Azure Key Vault** and other secret stores

### Monitoring

- **Validation metrics** in CI dashboards
- **Secrets health monitoring** with alerts
- **Compliance reporting** for security audits
- **Usage analytics** for secrets access patterns

---

## Quick Reference

### Commands

```bash
smithy env_validate [service]    # Validate environment
smithy env_sync [services]       # Sync .env.example files
smithy env_report               # Generate CI report
smithy secrets list             # List secrets (redacted)
smithy secrets get KEY          # Get secret value
smithy secrets set KEY value    # Set secret value
```

### Files

- `.env` - Actual environment values (not committed)
- `.env.example` - Template with placeholders (committed)
- `.credentials.vault` - Encrypted secrets vault (not committed)

### CI Triggers

- PRs with `.env.example` changes
- Pushes to main/release branches
- Daily validation at 3 AM UTC
- Manual workflow dispatch

### Validation Status

- ✅ **PASS**: All required keys present, valid formats
- ⚠️ **WARNING**: Non-critical issues (format warnings, undocumented keys)
- ❌ **FAIL**: Missing required keys, invalid configurations

---

*Last Updated: October 2025*
*Maintained by: Smithy Environment Goblin*
