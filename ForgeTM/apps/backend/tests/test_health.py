from fastapi.testclient import TestClient

from forge.main import app


client = TestClient(app)


def test_health_root():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
    assert "version" in data
    assert "uptime_sec" in data
