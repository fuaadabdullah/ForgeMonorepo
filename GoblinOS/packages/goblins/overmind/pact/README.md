---
title: Pact Contract Testing for Overmind
type: how-to
project: GoblinOS/Overmind
status: published
owner: GoblinOS
goblin_name: Overmind Contract Testing
---

# Pact Contract Testing

Contract testing for Overmind API ↔ Bridge communication using [Pact](https://pact.io/).

## Overview

Pact ensures the API and Bridge services maintain compatible interfaces by:
1. **Consumer tests** (Bridge) generate contracts
2. **Provider tests** (API) verify they fulfill contracts
3. **Pact Broker** stores and versions contracts
4. **Can-I-Deploy** checks compatibility before deployment

## Quick Start

### Install Dependencies

```bash
# Node.js (Bridge consumer tests)
pnpm add -D @pact-foundation/pact

# Python (API provider tests)
pip install pact-python
```

### Run Consumer Tests (Bridge)

```bash
cd bridge
pnpm test:pact

# Generates pact file: pact/pacts/bridge-api.json
```

### Run Provider Tests (API)

```bash
cd api
pytest tests/pact/

# Verifies against contract from Pact Broker or local file
```

### Publish to Pact Broker

```bash
# Publish consumer contract
pact-broker publish \
  pact/pacts/bridge-api.json \
  --consumer-app-version=$(git rev-parse HEAD) \
  --branch=main \
  --broker-base-url=https://pact-broker.example.com \
  --broker-token=$PACT_BROKER_TOKEN

# Check deployment compatibility
pact-broker can-i-deploy \
  --pacticipant=bridge \
  --version=$(git rev-parse HEAD) \
  --to-environment=production \
  --broker-base-url=https://pact-broker.example.com \
  --broker-token=$PACT_BROKER_TOKEN
```

## Consumer Tests (Bridge)

Example consumer test for Bridge calling API:

```typescript
// bridge/src/__tests__/pact/api.pact.test.ts
import { pactWith } from 'jest-pact';
import { like, iso8601DateTimeWithMillis } from '@pact-foundation/pact/src/dsl/matchers';
import axios from 'axios';

pactWith(
  {
    consumer: 'bridge',
    provider: 'api',
    dir: './pact/pacts'
  },
  (interaction) => {
    interaction('POST /chat request with routing', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('API is healthy')
          .uponReceiving('a chat request')
          .withRequest({
            method: 'POST',
            path: '/api/chat',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              message: 'Hello, what is 2+2?',
              model: like('gemini-pro'),
              stream: false
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              response: like('The answer is 4'),
              model: 'gemini-pro',
              usage: {
                prompt_tokens: like(10),
                completion_tokens: like(5),
                total_tokens: like(15)
              },
              cost: like(0.0001),
              timestamp: iso8601DateTimeWithMillis()
            }
          });
      });

      execute('should get chat response', async (mockServer) => {
        const response = await axios.post(`${mockServer.url}/api/chat`, {
          message: 'Hello, what is 2+2?',
          model: 'gemini-pro',
          stream: false
        });

        expect(response.status).toBe(200);
        expect(response.data.response).toBeDefined();
        expect(response.data.model).toBe('gemini-pro');
        expect(response.data.usage.total_tokens).toBeGreaterThan(0);
      });
    });

    interaction('GET /health check', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('API is healthy')
          .uponReceiving('a health check request')
          .withRequest({
            method: 'GET',
            path: '/health'
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              status: 'healthy',
              version: like('1.0.0'),
              uptime: like(12345)
            }
          });
      });

      execute('should return healthy status', async (mockServer) => {
        const response = await axios.get(`${mockServer.url}/health`);

        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
      });
    });
  }
);
```

## Provider Tests (API)

Example provider test for API verifying Bridge contracts:

```python
# api/tests/pact/test_provider.py
import pytest
from pact import Verifier
import os

@pytest.fixture
def pact_verifier():
    """Configure Pact verifier for API provider."""
    return Verifier(
        provider='api',
        provider_base_url='http://localhost:8000'
    )

def test_verify_bridge_pacts(pact_verifier, api_server):
    """Verify API fulfills Bridge contracts."""

    # Option 1: Verify from Pact Broker
    success, logs = pact_verifier.verify_with_broker(
        broker_url=os.getenv('PACT_BROKER_URL'),
        broker_token=os.getenv('PACT_BROKER_TOKEN'),
        provider_version=os.getenv('GIT_COMMIT'),
        publish_verification_results=True,
        provider_states_setup_url='http://localhost:8000/pact/provider-states'
    )

    # Option 2: Verify from local file (CI/dev)
    # success, logs = pact_verifier.verify_pact_files(
    #     './pact/pacts/bridge-api.json',
    #     provider_states_setup_url='http://localhost:8000/pact/provider-states'
    # )

    assert success == 0, f"Pact verification failed:\n{logs}"

# Provider state setup endpoint
# api/app/pact.py
from fastapi import APIRouter

router = APIRouter(prefix="/pact")

@router.post("/provider-states")
async def setup_provider_state(state: dict):
    """Setup provider state for Pact verification."""
    state_name = state.get("state")

    if state_name == "API is healthy":
        # Ensure API is in healthy state
        return {"status": "success"}

    return {"status": "unknown state"}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/pact.yml
name: Pact Contract Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  consumer-tests:
    name: Bridge Consumer Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install
        working-directory: bridge

      - name: Run Pact consumer tests
        run: pnpm test:pact
        working-directory: bridge

      - name: Publish pacts
        if: github.ref == 'refs/heads/main'
        run: |
          pact-broker publish \
            pact/pacts \
            --consumer-app-version=${{ github.sha }} \
            --branch=main \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
        working-directory: bridge

  provider-tests:
    name: API Provider Tests
    runs-on: ubuntu-latest
    needs: consumer-tests
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt
        working-directory: api

      - name: Start API server
        run: |
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5
        working-directory: api

      - name: Run Pact provider tests
        run: pytest tests/pact/ -v
        working-directory: api
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT: ${{ github.sha }}

  can-i-deploy:
    name: Check Deployment Compatibility
    runs-on: ubuntu-latest
    needs: [consumer-tests, provider-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Can I deploy Bridge?
        run: |
          pact-broker can-i-deploy \
            --pacticipant=bridge \
            --version=${{ github.sha }} \
            --to-environment=production \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}

      - name: Can I deploy API?
        run: |
          pact-broker can-i-deploy \
            --pacticipant=api \
            --version=${{ github.sha }} \
            --to-environment=production \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

## Pact Broker Setup

### Using Pactflow (SaaS)

1. Sign up at https://pactflow.io/
2. Get API token from settings
3. Add to GitHub secrets:
   - `PACT_BROKER_URL`: https://your-org.pactflow.io
   - `PACT_BROKER_TOKEN`: your_token_here

### Self-hosted Pact Broker

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pactbroker
      POSTGRES_USER: pactbroker
      POSTGRES_PASSWORD: pactbroker
    volumes:
      - postgres-data:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgresql://pactbroker:pactbroker@postgres/pactbroker
      PACT_BROKER_BASIC_AUTH_USERNAME: pact
      PACT_BROKER_BASIC_AUTH_PASSWORD: pact
      PACT_BROKER_ALLOW_PUBLIC_READ: 'true'
    depends_on:
      - postgres

volumes:
  postgres-data:
```

Start with: `docker-compose up -d pact-broker`

Access at: http://localhost:9292 (user: pact, pass: pact)

## Best Practices

1. **Version contracts** with git commit SHA
2. **Publish on every build** for visibility
3. **Use matchers** (like, eachLike) for flexible contracts
4. **Test provider states** independently
5. **Run can-i-deploy** before production deployment
6. **Tag releases** in Pact Broker for rollback reference

## Troubleshooting

### "Pact verification failed"

Check provider state setup:
```bash
curl -X POST http://localhost:8000/pact/provider-states \
  -H "Content-Type: application/json" \
  -d '{"state": "API is healthy"}'
```

### "Cannot publish to Pact Broker"

Verify credentials:
```bash
curl -H "Authorization: Bearer $PACT_BROKER_TOKEN" \
  $PACT_BROKER_URL/pacticipants
```

### "Consumer and provider versions incompatible"

Run can-i-deploy locally:
```bash
pact-broker can-i-deploy \
  --pacticipant=bridge \
  --latest \
  --to-environment=production \
  --broker-base-url=$PACT_BROKER_URL \
  --broker-token=$PACT_BROKER_TOKEN \
  --verbose
```

## References

- [Pact Documentation](https://docs.pact.io/)
- [Pact JS](https://github.com/pact-foundation/pact-js)
- [Pact Python](https://github.com/pact-foundation/pact-python)
- [Pact Broker](https://docs.pact.io/pact_broker)
- [Pactflow](https://pactflow.io/)

## License

MIT
