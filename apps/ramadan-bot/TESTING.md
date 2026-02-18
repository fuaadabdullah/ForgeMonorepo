# Testing Guide — Ramadan Fajr Bot

This document covers unit tests, E2E tests, coverage targets, and debugging.

## Quick start

### Run all tests locally

```bash
cd apps/ramadan-bot

# Set test mode (skips real API/SMTP)
export RAMADAN_TEST_MODE=1

# Run unit + E2E tests with coverage
pytest -q --cov=ramadan_production --cov-report=term-missing --cov-fail-under=80
```

Expected output:

```
20 passed in 3.24s
================================ tests coverage ================================
TOTAL                     291     35    88%
Required test coverage of 80% reached. Total coverage: 87.97%
```

### Run unit tests only

```bash
pytest -q tests/unit/
```

### Run E2E tests only

```bash
pytest -q -m e2e tests/e2e/
```

### Run with verbose output

```bash
pytest -vv --tb=short --cov=ramadan_production --cov-report=html
# Open htmlcov/index.html to view coverage report
```

## Test structure

```
tests/
  conftest.py            # Shared fixtures (load_module, temp_image)
  __init__.py
  unit/
    __init__.py
    test_core.py         # Core logic: dates, caching, markers, send
    test_overlay.py      # Overlay + image rendering
  e2e/
    __init__.py
    test_cli.py          # CLI flows: --send-now, --ci-run
```

## Test coverage

### Unit tests: `tests/unit/test_core.py`

| Function                       | Tests | Notes                             |
| ------------------------------ | ----- | --------------------------------- |
| `get_today_ramadan_day()`      | ✅ 2  | Start date, outside range         |
| `compute_fajr_for()`           | ✅ 1  | Astral dawn call                  |
| `cache_path_for_juz()`         | ✅ 1  | Path formatting                   |
| `already_sent_marker()`        | ✅ 3  | Local + S3 paths                  |
| `write_sent_marker()`          | ✅ 2  | Local + S3 write                  |
| `siliconflow_generate_bytes()` | ✅ 2  | Test mode + retry logic           |
| `generate_and_cache()`         | ✅ 2  | Cache hit + force regen           |
| `send_via_email_sms()`         | ✅ 2  | SendGrid + test mode              |
| `send_today()`                 | ✅ 2  | Outside Ramadan + successful send |
| `ci_run()`                     | ✅ 1  | Not fajr time                     |

### Unit tests: `tests/unit/test_overlay.py`

| Function                     | Tests | Notes                      |
| ---------------------------- | ----- | -------------------------- |
| `overlay_quran_text_bytes()` | ✅ 1  | Arabic/English overlay PNG |

### E2E tests: `tests/e2e/test_cli.py`

| CLI flow                     | Tests | Notes                |
| ---------------------------- | ----- | -------------------- |
| `--send-now --juz 1 --force` | ✅ 1  | Test mode send       |
| `--ci-run`                   | ✅ 1  | Ramadan bounds check |

**Total coverage: 88%** (target: ≥80%)

## Environment variables for testing

| Variable            | Default  | Purpose                                                   |
| ------------------- | -------- | --------------------------------------------------------- |
| `RAMADAN_TEST_MODE` | `0`      | Skip SiliconFlow API + SMTP (use placeholders)            |
| `MARKER_DIR`        | `/tmp`   | Override sent-marker storage directory                    |
| `SMS_RECIPIENTS`    | Empty    | Can test with fake addresses (e.g., `test@tmomail.net`)   |
| `FROM_EMAIL`        | Empty    | Can test with any email (test mode skips SMTP validation) |
| `LAT`, `LON`, `TZ`  | Defaults | Override location for Fajr calculation                    |

## Fixtures

### `load_module(monkeypatch, tmp_path)`

Dynamically imports `ramadan_production` with isolated env vars and temp dirs:

```python
def test_something(load_module):
    mod = load_module(
        TEST_MODE="1",
        SILICONFLOW_API_KEY="dummy"
    )
    # mod is now imported with custom env
```

Automatically patches:

- `CACHE_DIR` → temp cache
- `MARKER_DIR` → temp markers
- `TEST_MODE` → False (can override)

### `temp_image(tmp_path)`

Returns a minimal PNG file path for testing image send operations.

## Mocking strategy

Tests use `monkeypatch` to mock:

- **External APIs**: `requests.post`, `requests.get` (SiliconFlow)
- **SMTP**: `smtplib.SMTP` (SendGrid/Gmail)
- **S3**: `boto3.client` (sent markers)
- **Time**: `datetime.now`, `datetime.today` (Ramadan bounds)
- **Astral**: `dawn()` (Fajr calculation)

This ensures tests run in **deterministic order without hitting real services**.

### Example: Mocking SiliconFlow retry

```python
def test_siliconflow_generate_bytes_success(load_module, monkeypatch):
    mod = load_module()

    post_calls = {"count": 0}

    def fake_post(*args, **kwargs):
        post_calls["count"] += 1
        if post_calls["count"] == 1:
            return FakeResp(500, text="server error")  # Fail first, then succeed
        return FakeResp(200, payload={"images": [{"url": "..."}]})

    monkeypatch.setattr(mod.requests, "post", fake_post)
    # Test retry logic...
```

## Continuous Integration

### GitHub Actions (`.github/workflows/ramadan-ci.yml`)

Runs hourly (`0 * * * *`):

1. Install deps + download fonts
2. **Run tests with coverage gate** (`--cov-fail-under=80`)
3. If tests pass, run `--ci-run` in production mode

### CircleCI (`apps/ramadan-bot/.circleci/config.yml`)

Runs hourly on `main` branch:

1. Install deps + download fonts
2. **Run tests with coverage gate** (`--cov-fail-under=80`)
3. If tests pass, run `--ci-run` in production mode

Both will **fail the CI pipeline if coverage drops below 80%**.

## Debugging

### Run a single test with full output

```bash
pytest -vv tests/unit/test_core.py::test_send_today_sends_and_marks
```

### Drop into pdb on failure

```bash
pytest --pdb tests/unit/test_core.py
```

### Show print statements

```bash
pytest -s tests/unit/test_core.py
```

### Generate HTML coverage report

```bash
pytest --cov=ramadan_production --cov-report=html
open htmlcov/index.html
```

### Test with real env vars (manual integration test)

```bash
# Disable test mode, use real API keys
export RAMADAN_TEST_MODE=0
export SILICONFLOW_API_KEY=sk_...
export FROM_EMAIL=...
export SENDGRID_API_KEY=...

# Run a single test
pytest -vv tests/unit/test_core.py::test_ci_run_not_fajr
```

## Adding new tests

1. **Create a test file** in `tests/unit/` or `tests/e2e/`:

   ```python
   def test_my_feature(load_module, monkeypatch):
       mod = load_module()  # Isolated module import
       # Test code...
   ```

2. **Mock external services** using `monkeypatch`:

   ```python
   def fake_request(*args, **kwargs):
       return FakeResp(200, payload={...})
   monkeypatch.setattr(mod.requests, "get", fake_request)
   ```

3. **Verify coverage didn't drop**:

   ```bash
   pytest --cov=ramadan_production --cov-report=term-missing --cov-fail-under=80
   ```

4. **Commit and push**:
   - CI will run tests automatically
   - If coverage < 80%, CI pipeline fails
   - Update or add tests until coverage ≥ 80%

## Excluded from coverage

The following are marked with `# pragma: no cover`:

- `run_streamlit_ui()` — Interactive Streamlit UI (tested manually)
- `daemon_run()` — Long-running daemon loop (functional, but not unit-testable)
- `if __name__ == "__main__"` — CLI entrypoint

## Notes

- **Test mode** (`RAMADAN_TEST_MODE=1`) is the default for tests. It skips all real API/SMTP calls.
- **Deterministic dates**: Tests use fixed dates (e.g., `2026-02-18`) and monkeypatch `datetime` to ensure reproducibility.
- **Cleanup**: `tmp_path` fixture automatically cleans up temp files after each test.
- **No external deps**: Tests don't require SiliconFlow, SendGrid, S3, or Astral to be accessible.

## Test maintenance

When adding new features:

1. Write tests first (TDD)
2. Run `pytest --cov` to verify coverage
3. Add markers (`@pytest.mark.e2e`, etc.) if needed
4. Update this file with new test descriptions
5. Ensure all CI pipelines pass before merging

---

**Last updated**: February 18, 2026  
**Coverage target**: 80%  
**CI gates**: GitHub Actions + CircleCI
