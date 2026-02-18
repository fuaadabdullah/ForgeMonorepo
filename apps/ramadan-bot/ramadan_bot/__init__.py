"""Ramadan Fajr Bot — modular production package."""

__version__ = "1.0.0"


# Lazy imports to avoid circular dependencies
def __getattr__(name: str):
    from importlib import import_module

    modules_map = {
        "config": ".config",
        "logger": ".logger",
        "models": ".models",
        "cache": ".cache",
        "delivery": ".delivery",
        "cli": ".cli",
        "ui": ".ui",
    }

    if name in modules_map:
        return import_module(modules_map[name], __name__)

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
