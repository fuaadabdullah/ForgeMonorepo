import importlib
import sys


def test_chat_router_import_without_routing_key(monkeypatch):
    monkeypatch.delenv("ROUTING_ENCRYPTION_KEY", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    sys.modules.pop("backend.chat_router", None)
    module = importlib.import_module("backend.chat_router")

    assert hasattr(module, "router")
