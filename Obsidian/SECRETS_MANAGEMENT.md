# Secrets Management

This document describes the secrets management system for the ForgeMonorepo using SOPS and age encryption.

## Overview

The project uses [SOPS](https://github.com/mozilla/sops) with [age](https://github.com/FiloSottile/age) encryption to securely manage sensitive configuration like API keys and database credentials.

## File Structure

- `secrets.enc.yaml` - Encrypted secrets file (committed to git)
- `secrets.yaml` - Decrypted secrets file (ignored by git, created on-demand)
- `.sops.yaml` - SOPS configuration file
- `.sops/age-key.txt` - Age encryption key (never commit this!)

## Prerequisites

Install required tools:

```bash
# macOS
brew install sops age

# Linux
# Follow installation instructions at:
# https://github.com/mozilla/sops#download
# https://github.com/FiloSottile/age#installation
```

## Usage

### Decrypt secrets for development

```bash
# Decrypt all secrets
./decrypt-env.sh

# Decrypt specific project
./decrypt-env.sh goblinos
./decrypt-env.sh forgetm
```

### Encrypt secrets after updates

```bash
# Encrypt all secrets
./encrypt-env.sh

# Encrypt specific project
./encrypt-env.sh goblinos
./encrypt-env.sh forgetm
```

### Load secrets in application code

**Python (Pydantic Settings):**

```python
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv

load_dotenv()  # Load decrypted secrets.yaml

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gemini_api_key: str = Field(default="")
    # ... other fields
```

**Node.js/TypeScript:**

```typescript
import { config } from 'dotenv';
config(); // Load decrypted secrets.yaml

const geminiKey = process.env.GEMINI_API_KEY;
```

## Security Notes

- **Never commit** `secrets.yaml`, `.sops/age-key.txt`, or any decrypted secrets
- **Rotate keys** every 90 days (current rotation: Jan 19, 2026)
- **Share keys securely** - Use password managers or secure key exchange
- **Backup keys** - Store age keys in a secure location (not git)

## Key Rotation

To rotate encryption keys:

1. Generate new age key: `age-keygen -o .sops/age-key-new.txt`
2. Update `.sops.yaml` with new public key
3. Re-encrypt all secrets: `./encrypt-env.sh`
4. Update team members with new private key
5. Remove old key files

## Troubleshooting

### "no identity matched any of the recipients"

- Ensure `SOPS_AGE_KEY_FILE` points to correct age key file
- Verify age key file exists and has correct permissions

### "failed to decrypt"

- Check that you're using the same age key used for encryption
- Verify `.sops.yaml` configuration matches your key

## References

- [SOPS Documentation](https://github.com/mozilla/sops)
- [Age Encryption](https://github.com/FiloSottile/age)
- [API Keys Management](API_KEYS_MANAGEMENT.md)
