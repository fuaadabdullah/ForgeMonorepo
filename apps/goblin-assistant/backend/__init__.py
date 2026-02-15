"""
Goblin Assistant backend package.

This repo historically supported running from the `backend/` directory directly
(`uvicorn main:app`), which makes sibling modules importable as top-level
packages (e.g. `import config`).

When importing as a proper package (`import backend.main`), those absolute
imports would fail. To keep backwards compatibility, we alias `backend.config`
to the top-level module name `config` during package import.
"""

from __future__ import annotations

import sys
from importlib import import_module


def _alias_legacy_top_level_modules() -> None:
    try:
        cfg = import_module("backend.config")
        sys.modules.setdefault("config", cfg)
    except Exception:
        # If config can't import, allow package import to proceed; callers will
        # see the real error at first use.
        pass

    # Some modules historically imported `providers.*` when running from the
    # backend directory. Provide an alias for package imports.
    try:
        prov = import_module("backend.providers")
        sys.modules.setdefault("providers", prov)
    except Exception:
        pass


_alias_legacy_top_level_modules()
