from fastapi import FastAPI
from .doctor import run as doctor_run
from .bootstrap import run as bootstrap_run
from .config import sync as config_sync
from .tasks import check as tasks_check

app = FastAPI(title="Smithy Service")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "smithy"}

@app.post("/smithy/doctor")
def doctor():
    doctor_run()
    return {"ok": True}

@app.post("/smithy/bootstrap")
def bootstrap():
    bootstrap_run()
    return {"ok": True}

@app.post("/smithy/sync-config")
def sync_config():
    config_sync()
    return {"ok": True}

@app.post("/smithy/check")
def check():
    tasks_check()
    return {"ok": True}
