import sys
import importlib

import pytest


@pytest.fixture()
def load_module(tmp_path, monkeypatch):
    def _load(**env_overrides):
        for key, value in env_overrides.items():
            monkeypatch.setenv(key, str(value))

        if "ramadan_production" in sys.modules:
            del sys.modules["ramadan_production"]

        module = importlib.import_module("ramadan_production")

        cache_dir = tmp_path / "cache"
        marker_dir = tmp_path / "markers"
        cache_dir.mkdir(parents=True, exist_ok=True)
        marker_dir.mkdir(parents=True, exist_ok=True)

        monkeypatch.setattr(module, "CACHE_DIR", str(cache_dir))
        monkeypatch.setattr(module, "MARKER_DIR", str(marker_dir))
        monkeypatch.setattr(module, "TEST_MODE", False)

        return module

    return _load


@pytest.fixture()
def temp_image(tmp_path):
    path = tmp_path / "image.png"
    path.write_bytes(b"\x89PNG\r\n\x1a\n")
    return path
