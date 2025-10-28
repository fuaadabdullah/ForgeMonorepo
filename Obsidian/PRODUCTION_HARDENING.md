# GoblinOS: Production Hardening

This document outlines the production-grade tooling and workflows implemented for GoblinOS.

## Table of Contents

- [TypeScript Project References](#typescript-project-references)
- [Testing & Coverage](#testing--coverage)
- [Linting & Formatting](#linting--formatting)
- [Release Pipeline](#release-pipeline)
- [CI/CD](#cicd)
- [Security & Supply Chain](#security--supply-chain)
- [Dependency Management](#dependency-management)
- [Architecture Guardrails](#architecture-guardrails)
- [Quick Start](#quick-start)

---

## TypeScript Project References

**What it is:** Incremental compilation with proper module boundaries.

**Files:**
- `tsconfig.build.json` - Root build orchestration
- `tsconfig.base.json` - Shared compiler options with `composite: true`
- Each package has `composite: true` in its tsconfig

**Usage:**
```bash
# Incremental build (fast!)
pnpm -C GoblinOS build

# Type check without emit
pnpm -C GoblinOS check
```

**Benefits:**
- 3-10x faster incremental builds
- Enforces clean module boundaries
- Better IDE performance

**Docs:** [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

## Testing & Coverage

**What it is:** Vitest with v8 coverage and strict thresholds.

**Files:**
- `vitest.config.ts` - Coverage provider and thresholds

**Thresholds:**
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

**Usage:**
```bash
# Run tests
pnpm -C GoblinOS test

# Watch mode
pnpm -C GoblinOS test:watch

# With coverage
pnpm -C GoblinOS test:coverage
```

**CI:** Coverage reports are uploaded as artifacts on Node 20 runs.

**Docs:** [Vitest Coverage](https://vitest.dev/guide/coverage.html)

---

## Linting & Formatting

**What it is:** Biome for fast, modern linting and formatting.

**Files:**
- `biome.json` - Configuration with recommended rules

**Features:**
- Linter + formatter in one tool
- Rust-powered (fast)
- Git-aware
- Auto-import organization

**Usage:**
```bash
# Check for issues
pnpm -C GoblinOS lint

# Fix auto-fixable issues
pnpm -C GoblinOS lint:fix

# Format code
pnpm -C GoblinOS format
```

**Why not ESLint?** Biome is 10-100x faster and has less config bloat. ESLint v9 flat config is a fine alternative if you need specific plugins.

**Docs:** [Biome](https://biomejs.dev/)

---

## Release Pipeline

**What it is:** Changesets-powered versioning with npm provenance.

**Files:**
- `.changeset/config.json` - Changesets configuration
- `.github/workflows/release.yml` - Automated release workflow

**How it works:**
1. Create a changeset: `pnpm changeset`
2. Commit and push
3. Changesets creates a "Version Packages" PR
4. Merge the PR → packages are versioned, changelogs updated, and published to npm with provenance

**Manual release:**
```bash
pnpm -C GoblinOS release
```

**Provenance:** Every package published gets a signed attestation linking it to the exact commit and workflow. Consumers can verify with:
```bash
npm audit signatures
```

**Docs:**
- [Changesets](https://github.com/changesets/changesets)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [Sigstore](https://blog.sigstore.dev/cosign-verify-bundles/)

---

## CI/CD

**What it is:** Multi-version matrix testing with smart caching.

**Files:**
- `.github/workflows/goblinos-ci.yml` - Main CI workflow
- `.github/workflows/release.yml` - Release automation

**CI runs:**
- Node 20 & 22 in parallel
- Type checking (`tsc -b`)
- Linting (Biome)
- Tests with coverage
- Full build
- Coverage upload (Node 20 only)

**Cache strategy:** `setup-node` with `cache: 'pnpm'` automatically caches `node_modules` based on lockfile hash.

**Trigger:**
- Push to main
- Pull requests
- Changes to `GoblinOS/**` or workflow file

**Docs:** [GitHub Actions - setup-node](https://github.com/actions/setup-node)

---

## Security & Supply Chain

**What it is:** OpenSSF Scorecard, CodeQL, and SBOM generation.

**Files:**
- `.github/workflows/codeql.yml` - Static analysis for vulnerabilities
- `.github/workflows/scorecard.yml` - Repository health scoring
- `.github/workflows/sbom.yml` - Software Bill of Materials

### CodeQL
**Purpose:** Find security vulnerabilities in code.
**When:** Weekly + on every PR.
**Output:** Security alerts in GitHub Security tab.

### OpenSSF Scorecard
**Purpose:** Grade repository health (CI, dependencies, branch protection, etc.).
**When:** Weekly.
**Output:** SARIF uploaded to Security tab + artifact.

### SBOM (Syft)
**Purpose:** Generate dependency inventory in CycloneDX and SPDX formats.
**When:** On push, PR, and releases.
**Output:** Artifacts you can attach to releases or audit.

**Docs:**
- [CodeQL](https://github.com/github/codeql-action)
- [Scorecard](https://github.com/ossf/scorecard)
- [Syft](https://github.com/anchore/syft)
- [SLSA Framework](https://slsa.dev/)

---

## Dependency Management

**What it is:** Renovate for automated, grouped updates.

**Files:**
- `.github/renovate.json` - Renovate configuration

**Strategy:**
- Non-major updates grouped and auto-merged if tests pass
- TypeScript gets its own PR (breaking changes common)
- GitHub Actions grouped separately
- Weekly schedule (Mondays before 6 AM UTC)
- Lockfile maintenance enabled

**Manual override:** You can always create changesets and update manually.

**Alternative:** Dependabot (`.github/dependabot.yml`) if you prefer GitHub native.

**Docs:** [Renovate](https://docs.renovatebot.com/)

---

## Architecture Guardrails

**What it is:** dependency-cruiser enforces module boundaries and bans circular deps.

**Files:**
- `.dependency-cruiser.js` - Rules configuration

**Rules:**
- **no-circular:** Error on circular dependencies
- **no-cross-layer:** GoblinOS packages cannot import from ForgeTM or Obsidian
- **no-orphans:** Warn on dead code
- **no-deprecated-core:** Warn on deprecated Node.js APIs

**Usage:**
```bash
pnpm -C GoblinOS deps:check
```

**CI:** Add this to your workflow if you want to enforce in CI (not currently wired).

**Docs:** [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)

---

## Quick Start

### First-time setup
```bash
cd ForgeMonorepo/GoblinOS
pnpm install
```

### Day-to-day development
```bash
# Run CLI in dev mode
pnpm dev

# Type check
pnpm check

# Lint
pnpm lint

# Test with coverage
pnpm test:coverage

# Build everything
pnpm build
```

### Before opening a PR
```bash
pnpm lint:fix
pnpm test:coverage
pnpm build
```

### Releasing
```bash
# Create a changeset
pnpm changeset

# Follow prompts, commit, and push
# Changesets will create a "Version Packages" PR
# Merge it to publish
```

---

## Next Steps (Optional Polish)

These are **not required** but can be added for extra polish:

1. **Nx task graph** - If builds get slow, add Nx for distributed task caching
2. **jscpd** - Copy-paste detection
3. **PR templates** - Guide contributors
4. **CODEOWNERS** - Route reviews automatically
5. **tsdown/unbuild** - Modern build tools (tsup is deprecated)

---

## Summary

| Capability | Tool | Status |
|------------|------|--------|
| Incremental builds | TS Project References | ✅ |
| Testing | Vitest + v8 coverage | ✅ |
| Linting | Biome | ✅ |
| Releases | Changesets + provenance | ✅ |
| CI | Node 20/22 matrix | ✅ |
| Security | CodeQL + Scorecard + SBOM | ✅ |
| Dependencies | Renovate | ✅ |
| Arch guardrails | dependency-cruiser | ✅ |

**The stack is now production-ready. Ship it.**
