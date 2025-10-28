# Installation Checklist

Follow these steps to complete the GoblinOS hardening setup.

## 1. Install Dependencies

```bash
cd ForgeMonorepo/GoblinOS
pnpm install
```

This will install:
- @biomejs/biome
- @changesets/cli
- @vitest/coverage-v8
- dependency-cruiser
- All other dependencies from package.json

## 2. Verify Setup

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

All should pass (or show minimal warnings for new packages with no tests yet).

## 3. Configure GitHub Secrets (for releases)

If you plan to publish to npm, add `NPM_TOKEN` to repository secrets:

1. Go to repository Settings → Secrets and variables → Actions
2. Add `NPM_TOKEN` with your npm automation token
3. Ensure token has publish permissions for `@goblinos/*` scope

## 4. Enable GitHub Actions

Ensure these workflows are enabled:

- ✅ `.github/workflows/goblinos-ci.yml`
- ✅ `.github/workflows/release.yml`
- ✅ `.github/workflows/codeql.yml`
- ✅ `.github/workflows/scorecard.yml`
- ✅ `.github/workflows/sbom.yml`

Check: Repository Settings → Actions → General → Allow all actions

## 5. Enable Renovate (Optional)

Two options:

### Option A: Renovate App (Recommended)
1. Install Renovate GitHub App: https://github.com/apps/renovate
2. Grant access to your repository
3. Config is already in `.github/renovate.json`

### Option B: Dependabot (Alternative)
1. Create `.github/dependabot.yml` with npm and github-actions ecosystems
2. Enable Dependabot in repository settings

## 6. Configure Branch Protection (Recommended)

Repository Settings → Branches → Add rule for `main`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging:
  - `ci (20)`
  - `ci (22)`
  - `CodeQL`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging

## 7. Add CODEOWNERS (Optional)

Create `.github/CODEOWNERS`:

```
# GoblinOS ownership
/GoblinOS/ @fuaadabdullah

# Workflows and CI
/.github/workflows/ @fuaadabdullah

# Root configs
/.dependency-cruiser.js @fuaadabdullah
```

Enable in branch protection: "Require review from Code Owners"

## 8. First Release

```bash
# Create initial changeset
pnpm -C GoblinOS changeset

# Follow prompts, then:
git add .
git commit -m "chore: initial changeset"
git push
```

This will trigger the release workflow which creates a "Version Packages" PR.

## 9. Verify CI

Push a test commit to a branch and open a PR. Verify:

- ✅ CI runs on Node 20 & 22
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Tests run (with coverage)
- ✅ Build completes
- ✅ CodeQL runs (may take a few minutes)

## 10. Review Security Tab

Check repository Security tab:

- ✅ CodeQL findings (should be empty or minimal)
- ✅ Scorecard results (aim for 7+ score)
- ✅ Dependabot/Renovate PRs appearing

---

## Troubleshooting

### pnpm install fails

Ensure you have pnpm 9:
```bash
npm install -g pnpm@9
```

### CI fails with "NPM_TOKEN not found"

This is expected if you haven't set up npm publishing yet. The release workflow only runs on main, and it's fine to skip it for now.

### Scorecard workflow fails

The OpenSSF Scorecard action reference might need updating. Check for the latest stable version:
```yaml
uses: ossf/scorecard-action@v2.x.x
```

### Coverage threshold failures

Adjust thresholds in `vitest.config.ts` if they're too aggressive for initial setup:
```typescript
thresholds: {
  lines: 80,      // Start lower
  functions: 80,
  branches: 75,
  statements: 80
}
```

Gradually increase as you add tests.

---

## Next Steps

1. Read [PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md) for deep dives
2. Check [COMMANDS.md](./COMMANDS.md) for quick reference
3. Start developing! 🚀

**The foundation is solid. Ship it without flinching.**
