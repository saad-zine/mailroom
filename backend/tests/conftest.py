"""Pytest fixtures: isolated temp DB + a client with one completed run."""
import os
import sys
import time
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Isolated DBs — set BEFORE importing the app (settings reads env at import).
TMP = Path(os.environ.get("TMPDIR", "/tmp")) / "automail-test"
TMP.mkdir(parents=True, exist_ok=True)
os.environ["AUTOMAIL_DB_PATH"] = str(TMP / "test-automail.db")
os.environ["AUTOMAIL_CHECKPOINTS_PATH"] = str(TMP / "test-checkpoints.db")
os.environ["AUTOMAIL_MODE"] = "mock"
os.environ.pop("GROQ_API_KEY", None)
os.environ.pop("GOOGLE_API_KEY", None)
for f in ("test-automail.db", "test-automail.db-wal", "test-automail.db-shm",
          "test-checkpoints.db"):
    p = TMP / f
    if p.exists():
        p.unlink()

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


def _wait_for_run(client: TestClient, run_id: int, timeout: int = 120) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/api/runs/{run_id}")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        if data["status"] in ("completed", "failed"):
            return data
        time.sleep(0.5)
    raise AssertionError(f"run {run_id} did not finish within {timeout}s")


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        # One full mock run up front so drafts exist for the other tests.
        resp = c.post("/api/runs")
        assert resp.status_code == 200, resp.text
        run_id = resp.json()["run_id"]
        result = _wait_for_run(c, run_id)
        assert result["status"] == "completed", result
        c.run_id = run_id
        yield c
