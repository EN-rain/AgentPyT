from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from dexscreener_cli import web_api
from dexscreener_cli.web_runtime import WebRuntime as RealWebRuntime


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(web_api, "WebRuntime", lambda: RealWebRuntime(base_dir=tmp_path))
    with TestClient(web_api.app) as test_client:
        yield test_client


def test_health_and_config_roundtrip(client: TestClient) -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True

    patch = client.patch("/api/config", json={"cache_ttl_seconds": 13, "default_limit": 15})
    assert patch.status_code == 200
    assert patch.json()["config"]["cache_ttl_seconds"] == 13

    config = client.get("/api/config")
    assert config.status_code == 200
    body = config.json()
    assert body["config"]["cache_ttl_seconds"] == 13
    assert body["config"]["default_limit"] == 15


def test_preset_and_task_crud(client: TestClient) -> None:
    preset = client.post(
        "/api/presets",
        json={
            "name": "web-test",
            "chains": ["solana", "base"],
            "limit": 8,
            "min_liquidity_usd": 10_000,
            "min_volume_h24_usd": 20_000,
            "min_txns_h1": 8,
            "min_price_change_h1": -8,
        },
    )
    assert preset.status_code == 200

    presets = client.get("/api/presets").json()
    assert any(item["name"] == "web-test" for item in presets["items"])

    task = client.post(
        "/api/tasks",
        json={
            "name": "watch-sol",
            "preset": "web-test",
            "interval_seconds": 60,
            "notes": "test task",
        },
    )
    assert task.status_code == 200

    tasks = client.get("/api/tasks").json()
    assert tasks["count"] == 1
    task_item = tasks["items"][0]
    assert task_item["name"] == "watch-sol"
    assert task_item["preset"] == "web-test"

    delete = client.delete(f"/api/tasks/{task_item['id']}")
    assert delete.status_code == 200
    assert delete.json()["ok"] is True


def test_mcp_config_write(client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(web_api, "BASE_DIR", tmp_path)
    response = client.post("/api/mcp/config/write")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True

    mcp_path = tmp_path / ".mcp.json"
    assert mcp_path.exists()
    data = json.loads(mcp_path.read_text(encoding="utf-8"))
    assert "mcpServers" in data
    assert "pyagentt" in data["mcpServers"]


def test_skills_endpoints(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        web_api,
        "_run_skills_command",
        lambda args: {"command": ["npx", "skills", *args], "exitCode": 0, "stdout": "ok", "stderr": ""},
    )
    find = client.post("/api/skills/find", json={"query": "react"})
    assert find.status_code == 200
    assert find.json()["exitCode"] == 0

    install = client.post(
        "/api/skills/install",
        json={"package": "vercel-labs/agent-skills@vercel-react-best-practices", "global_install": True},
    )
    assert install.status_code == 200
    assert install.json()["stdout"] == "ok"
