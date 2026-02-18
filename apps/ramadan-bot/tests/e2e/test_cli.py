import json
import os
import subprocess
import sys
import pytest


def _run_cli(args, env, cwd):
    result = subprocess.run(
        [sys.executable, "main.py", *args],
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stderr

    for line in reversed(result.stdout.splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)

    raise AssertionError(f"No JSON output found. stdout: {result.stdout}")


@pytest.mark.e2e
def test_cli_send_now(tmp_path):
    env = os.environ.copy()
    env.update(
        {
            "RAMADAN_TEST_MODE": "1",
            "SMS_RECIPIENTS": "test@tmomail.net",
            "FROM_EMAIL": "test@example.com",
            "MARKER_DIR": str(tmp_path / "markers"),
            "LAT": "40.7128",
            "LON": "-74.0060",
            "TZ": "America/New_York",
        }
    )

    res = _run_cli(
        ["--send-now", "--juz", "1", "--force"],
        env,
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
    )
    assert res.get("sent") is True


@pytest.mark.e2e
def test_cli_ci_run(tmp_path):
    env = os.environ.copy()
    env.update(
        {
            "RAMADAN_TEST_MODE": "1",
            "SMS_RECIPIENTS": "test@tmomail.net",
            "FROM_EMAIL": "test@example.com",
            "MARKER_DIR": str(tmp_path / "markers"),
            "LAT": "40.7128",
            "LON": "-74.0060",
            "TZ": "America/New_York",
        }
    )

    res = _run_cli(
        ["--ci-run"],
        env,
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
    )
    assert "sent" in res or "skipped" in res
