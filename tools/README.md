---
title: Tools
type: reference
project: ForgeMonorepo
status: draft
owner: GoblinOS
---

Cross-repository scripts, generators, and utilities.

## Contents

- `lint_all.sh` - Run linters across all projects
- `smoke.sh` - Health check for all services
- `forge-new/` - Scaffolding tool for new packages
- `templates/` - Reusable templates

## Usage

Scripts should be run from the repository root:

```bash
bash tools/lint_all.sh
bash tools/smoke.sh
```
