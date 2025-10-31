---
title: API Keys Management
---

This document explains where to store API keys for the ForgeMonorepo and the team's recommended practices.

Required keys (examples referenced across the repo)
- GEMINI_API_KEY
- GEMINI_API_KEY_FORGETM
- DEEPSEEK_API_KEY
- OPENAI_API_KEY
- POLYGON_API_KEY
- LITELLM_API_KEY
- PINECONE_API_KEY (optional, used by RAG)

Do NOT commit secret values to the repository. Recommended approaches:

- smithy secrets (preferred)
  - Use the repo's smithy secrets manager where available (see `smithy secrets` commands).
  - Example: `smithy secrets set OPENAI_API_KEY "<value>"`

- Environment files (developer/local)
  - Keep runtime secrets in `.env` files (untracked) and use `.env.example` as a template with placeholders.
  - Ensure `.gitignore` contains `.env` and any credential vault files.

- CI / Cloud
  - Store secrets in your CI/CD provider's secret store (GitHub Secrets, Azure Key Vault, etc.).
  - Do not place secrets in pipeline YAMLs or logs.

Rotation and access

- Rotate keys regularly (recommended 90 days) and maintain a changelog of rotations.

- Use least privilege API keys where the provider supports it (per-service keys, read-only scopes, etc.).

Verification checks

- The repository's `tools/api_keys_check.sh` will verify that the `.env.example` files contain the expected key names and that this document exists.

- If you add or remove required keys, update `.env.example` files and this document.

Quick commands (do not paste secret values into chat):

```bash
# Set secrets with smithy (preferred)
smithy secrets set OPENAI_API_KEY "<value>"
smithy secrets set GEMINI_API_KEY "<value>"

# Sync secrets into a local .env file for developer use
smithy secrets sync-env .env --keys OPENAI_API_KEY,GEMINI_API_KEY,PINECONE_API_KEY

# List redacted secrets
smithy secrets list
```

If you need help adding keys to your local environment or CI, ask the repo maintainers or follow the `Obsidian/🔐 Security & Keys/` guides.

## Keeper Runbook

- Run the VS Code tasks labeled **"🛡️ Sentenial: API key audit"** and **"🛡️ Sentenial: security scan"** after key rotations or infra changes to keep documentation and security tooling in sync.
- Use **"🛡️ Sentenial: storage cleanup"** (`tools/space_saver.sh`) when vault or secrets archives start to exceed quotas—archives are written to the external volume before cleanup.
