# Commit Message Template

Use this as your commit message when committing the hardening changes.

---

```
feat(goblinos): production hardening with world-class tooling [workspace updated]

Upgrade GoblinOS from "works on my machine" to production-ready with
enterprise-grade tooling, security scanning, and automated releases.

## TypeScript Project References
- Add tsconfig.build.json for incremental compilation
- Enable composite: true across all packages
- 3-10x faster incremental builds

## Testing & Coverage
- Configure Vitest with v8 coverage provider
- Enforce strict thresholds: 90% lines/functions, 85% branches
- HTML, JSON, and text coverage reports

## Linting & Formatting
- Replace ESLint+Prettier with Biome (10-100x faster)
- Git-aware, auto-import organization
- Recommended rules with TypeScript support

## Release Pipeline
- Install Changesets for semantic versioning
- Automated changelog generation
- Multi-package coordination
- npm provenance for verifiable supply chain

## CI/CD
- Upgrade CI with Node 20/22 matrix
- Smart pnpm caching with setup-node
- Coverage artifact uploads
- Proper build verification

## Security & Supply Chain
- CodeQL for vulnerability scanning
- OpenSSF Scorecard for repository health
- Syft SBOM generation (CycloneDX + SPDX)
- Weekly security scans

## Dependency Management
- Configure Renovate for automated updates
- Grouped non-major updates with auto-merge
- TypeScript gets separate PRs
- Weekly schedule + vulnerability alerts

## Architecture Guardrails
- dependency-cruiser enforces module boundaries
- No circular dependencies (error)
- No cross-layer violations (error)
- Orphan detection (warn)

## Documentation
- PRODUCTION_HARDENING.md - Deep dive on all tooling
- SETUP.md - Installation & troubleshooting
- HARDENING_SUMMARY.md - Implementation summary
- COMMANDS.md - Quick command reference
- INSTALLATION_CHECKLIST.md - Post-merge setup

## Files Changed
- GoblinOS/package.json - Updated scripts & dependencies
- GoblinOS/tsconfig.*.json - Project references
- GoblinOS/vitest.config.ts - Test configuration
- GoblinOS/biome.json - Lint/format rules
- GoblinOS/.changeset/* - Release configuration
- .github/workflows/release.yml - Automated releases
- .github/workflows/goblinos-ci.yml - Matrix testing
- .github/workflows/codeql.yml - Security scanning
- .github/workflows/scorecard.yml - Health monitoring
- .github/workflows/sbom.yml - Supply chain transparency
- .github/renovate.json - Dependency automation
- .dependency-cruiser.js - Architecture rules

## Breaking Changes
None. This is additive infrastructure.

## Next Steps
1. Run `pnpm install` in GoblinOS/
2. Configure GitHub secrets (NPM_TOKEN for releases)
3. Enable Renovate or Dependabot
4. Configure branch protection
5. See INSTALLATION_CHECKLIST.md

Docs/instructions: .github/copilot-instructions.md, tools/.aitk/instructions/tools.instructions.md
AITK-tools-used: none (infrastructure setup)
Tool-owner: GoblinOS
Goblin-name: Production Infrastructure

Co-authored-by: GitHub Copilot <noreply@github.com>
```

---

## How to Use

```bash
# Stage all changes
git add GoblinOS/ .github/workflows/ .dependency-cruiser.js

# Commit with the message above
git commit -F Obsidian/COMMIT_MESSAGE.md

# Or copy/paste the message manually
git commit
```
