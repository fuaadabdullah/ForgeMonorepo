# Secrets Scanning (gitleaks, trufflehog, detect-secrets)

Owner: Magnolia Nightbloom (Huntress Guild)

This document describes the repository-level secret scanning strategy: local pre-commit checks via `lefthook` and staged `detect-secrets`, a wrapper `tools/secrets/secrets_scan.sh`, and CI scans that upload SARIF to GitHub Code Scanning.

How to run locally
-------------------

1. Fast staged check (recommended before commit):

   bash tools/secrets/secrets_scan.sh --staged

2. Full local scan (may take several minutes):

   bash tools/secrets/secrets_scan.sh --full

3. CI mode (mimics CI runners):

   bash tools/secrets/secrets_scan.sh --ci

Baselines
---------

Baselines for `detect-secrets` live at `tools/secrets/detect-secrets-baseline.json`.
To regenerate a baseline:

  detect-secrets scan > tools/secrets/detect-secrets-baseline.json

Have Magnolia and Sentenial review the change before committing.

CI integration
--------------

The workflow `.github/workflows/secrets-scan.yml` runs on PRs and nightly. It uploads SARIF files to GitHub Code Scanning for triage.

Failing policy
--------------

By default, CI will not automatically block merges on findings until baselines are tuned.
After an initial tuning window (7 days), set the policy to fail for high-severity findings. Magnolia will manage the policy and thresholds.

Contacts & triage
-----------------

- Magnolia Nightbloom (Huntress Guild) — triage and classification
- Sentenial Ledgerwarden (Keepers Guild) — remediation and secrets rotation
