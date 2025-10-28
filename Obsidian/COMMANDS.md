# GoblinOS Command Reference

Quick reference for all available commands.

## Development

```bash
# Start CLI in dev mode
pnpm dev

# Type check (no emit)
pnpm check

# Build incrementally
pnpm build
```

## Testing

```bash
# Run tests once
pnpm test

# Watch mode
pnpm test:watch

# With coverage report
pnpm test:coverage
```

## Linting & Formatting

```bash
# Check for lint errors
pnpm lint

# Auto-fix lint errors
pnpm lint:fix

# Format code
pnpm format
```

## Architecture

```bash
# Check dependency rules
pnpm deps:check
```

## Releasing

```bash
# Create a changeset
pnpm changeset

# Version packages (manual)
pnpm version

# Publish (manual - usually automated)
pnpm release
```

## CI/CD

CI runs automatically on PRs and pushes. To run locally what CI runs:

```bash
pnpm check
pnpm lint
pnpm test:coverage
pnpm build
```

## Troubleshooting

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clean build
rm -rf packages/*/dist
pnpm build
```

## One-Liners for PRs

```bash
# Before opening a PR (the works)
pnpm lint:fix && pnpm test:coverage && pnpm build
```

## Smithy CLI (Dependency Management & Code Quality)

```bash
# Dependency Management
smithy deps update          # Update all Python dependencies
smithy deps resolve         # Resolve dependency conflicts
smithy deps audit           # Security audit and vulnerability checks
smithy deps sync            # Sync environment with lockfile

# Secrets & Configuration
smithy secrets list         # Redacted view of stored secrets
smithy secrets get KEY      # Print a specific secret value
smithy secrets set KEY VAL  # Persist to keyring and optional .env file
smithy secrets sync-env .env --keys KEY1,KEY2

# Biome Operations
smithy biome-check          # Check Biome linting
smithy biome-fix            # Auto-fix Biome issues
smithy biome-format         # Format with Biome
smithy biome-imports        # Organize imports with Biome

# Via pnpm (from root)
pnpm smithy deps update
pnpm smithy biome-check
```

## Documentation

- [PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md) - Full tooling guide
- [SETUP.md](./SETUP.md) - Installation & troubleshooting
- [HARDENING_SUMMARY.md](./HARDENING_SUMMARY.md) - What was implemented
