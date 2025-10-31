# Installation & Setup Guide

## Prerequisites

- Node.js 20 or 22
- pnpm 9
- Git

## Initial Setup

```bash
# From repository root
cd ForgeMonorepo/GoblinOS

# Install dependencies
pnpm install

# Install dependencies for tooling (optional but recommended)
pnpm add -D @biomejs/biome @changesets/cli @vitest/coverage-v8 dependency-cruiser
```

## Verify Setup

```bash
# Type check
pnpm check

# Run tests
pnpm test

# Lint
pnpm lint

# Build
pnpm build
```

All commands should pass. If they don't, check the error messages and ensure all dependencies are installed.

## Development Workflow

### 1. Make changes

Edit code in `packages/cli`, `packages/goblins/*`, etc.

### 2. Type check as you go

```bash
pnpm check
```

### 3. Run tests

```bash
# Watch mode
pnpm test:watch

# Single run with coverage
pnpm test:coverage
```

### 4. Lint and format

```bash
# Check for issues
pnpm lint

# Auto-fix
pnpm lint:fix
```

### 5. Build

```bash
pnpm build
```

### 6. Create a changeset (if shipping)

```bash
pnpm changeset
```

Follow the prompts to describe your changes and which packages are affected.

## CI/CD

### What runs on PRs

- Type checking (Node 20 & 22)
- Linting (Biome)
- Tests with coverage
- Full build

### What runs on main

All of the above, plus:

- CodeQL security analysis
- OpenSSF Scorecard
- SBOM generation
- Release automation (if changesets exist)

## Releasing

Releases are automated via Changesets:

1. Create changeset: `pnpm changeset`
2. Commit and push
3. Changesets bot creates a "Version Packages" PR
4. Merge the PR → packages are versioned, changelogs updated, and published to npm

### Manual release (emergency only)

```bash
pnpm -C GoblinOS release
```

This requires `NPM_TOKEN` in your environment.

## Troubleshooting

### Build is slow

Project references enable incremental builds. After the first build, subsequent builds should be much faster (only changed packages rebuild).

### Coverage threshold failures

Current thresholds:
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

Add tests to meet thresholds, or adjust in `vitest.config.ts` if thresholds are too aggressive for your use case.

### Lint errors

```bash
# See what's wrong
pnpm lint

# Auto-fix
pnpm lint:fix
```

For unfixable issues, check `biome.json` rules. You can disable specific rules if needed.

### Dependency conflicts

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Type errors in CI but not locally

Ensure you're using the same Node version as CI (20 or 22). Check `.github/workflows/goblinos-ci.yml` for the matrix.

## Architecture

```
GoblinOS/
├── packages/
│   ├── cli/              # CLI entry point
│   └── goblins/
│       ├── quillwarden/       # Vault automation
│       ├── repo-bootstrap/    # Repo scaffolding
│       └── workspace-health/  # Health checks
├── tsconfig.build.json   # Build orchestration
├── vitest.config.ts      # Test configuration
├── biome.json           # Lint/format rules
└── .changeset/          # Versioning metadata
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run CLI in dev mode |
| `pnpm check` | Type check (no emit) |
| `pnpm build` | Incremental build |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Tests + coverage report |
| `pnpm lint` | Check for lint errors |
| `pnpm lint:fix` | Auto-fix lint errors |
| `pnpm format` | Format code |
| `pnpm deps:check` | Check dependency rules |
| `pnpm changeset` | Create changeset |
| `pnpm release` | Manual release |

## Next Steps

See [PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md) for details on all tooling.
