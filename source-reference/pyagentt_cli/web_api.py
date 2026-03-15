from __future__ import annotations

import asyncio
import json
import os
import re
import subprocess
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .alerts import validate_webhook_url
from .config import DEFAULT_CHAINS
from .models import HotTokenCandidate
from .scoring import build_distribution_heuristics
from .state import StateStore
from .web_runtime import KNOWN_CHAINS, WebRuntime, parse_chains, serialize_candidate, serialize_pair

BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"
ASSETS_DIR = WEB_DIR / "assets"
PROFILE_FILTERS: dict[str, dict[str, float]] = {
    "strict": {"min_liquidity_usd": 35_000.0, "min_volume_h24_usd": 90_000.0, "min_txns_h1": 50},
    "balanced": {"min_liquidity_usd": 20_000.0, "min_volume_h24_usd": 40_000.0, "min_txns_h1": 25},
    "discovery": {"min_liquidity_usd": 8_000.0, "min_volume_h24_usd": 10_000.0, "min_txns_h1": 5},
}
TASK_STATUSES: tuple[str, ...] = ("todo", "running", "done", "blocked")


def _skills_binary() -> str:
    return "npx.cmd" if os.name == "nt" else "npx"


def _mcp_binary_path() -> Path:
    if os.name == "nt":
        return BASE_DIR / ".venv" / "Scripts" / "pyagentt-mcp.exe"
    return BASE_DIR / ".venv" / "bin" / "pyagentt-mcp"


def _mcp_server_payload() -> dict[str, Any]:
    return {
        "mcpServers": {
            "pyagentt": {
                "command": str(_mcp_binary_path()),
                "args": [],
            }
        }
    }


def _sanitize_skills_query(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Query is required")
    if len(cleaned) > 120:
        raise ValueError("Query is too long")
    if not re.fullmatch(r"[a-zA-Z0-9\-_. /+]+", cleaned):
        raise ValueError("Query contains unsupported characters")
    return cleaned


def _sanitize_skill_package(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Package is required")
    if len(cleaned) > 160:
        raise ValueError("Package is too long")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+", cleaned):
        raise ValueError("Package must match owner/repo@skill")
    return cleaned


def _run_skills_command(args: list[str]) -> dict[str, Any]:
    cmd = [_skills_binary(), "skills", *args]
    try:
        result = subprocess.run(
            cmd,
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("npx is not installed or not available in PATH") from exc
    return {
        "command": cmd,
        "exitCode": result.returncode,
        "stdout": (result.stdout or "").strip(),
        "stderr": (result.stderr or "").strip(),
    }


class ScanRequest(BaseModel):
    chains: list[str] = Field(default_factory=lambda: list(DEFAULT_CHAINS))
    preset: str | None = None
    profile: str | None = None
    limit: int | None = Field(default=None, ge=1, le=100)
    min_liquidity_usd: float | None = Field(default=None, ge=0)
    min_volume_h24_usd: float | None = Field(default=None, ge=0)
    min_txns_h1: int | None = Field(default=None, ge=0)
    min_price_change_h1: float | None = None


class ConfigPatchRequest(BaseModel):
    cache_ttl_seconds: int | None = Field(default=None, ge=1, le=120)
    default_chains: list[str] | None = None
    watch_interval_seconds: int | None = Field(default=None, ge=2, le=120)
    default_limit: int | None = Field(default=None, ge=1, le=100)


class PresetSaveRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    chains: list[str] = Field(default_factory=lambda: list(DEFAULT_CHAINS))
    limit: int = Field(default=20, ge=1, le=100)
    min_liquidity_usd: float = Field(default=20_000.0, ge=0)
    min_volume_h24_usd: float = Field(default=40_000.0, ge=0)
    min_txns_h1: int = Field(default=30, ge=0)
    min_price_change_h1: float = -10.0


class TaskCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    preset: str | None = None
    chains: list[str] | None = None
    limit: int | None = Field(default=None, ge=1, le=100)
    min_liquidity_usd: float | None = Field(default=None, ge=0)
    min_volume_h24_usd: float | None = Field(default=None, ge=0)
    min_txns_h1: int | None = Field(default=None, ge=0)
    min_price_change_h1: float | None = None
    interval_seconds: int | None = Field(default=None, ge=15, le=86_400)
    webhook_url: str | None = None
    discord_webhook_url: str | None = None
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    alert_min_score: float | None = Field(default=None, ge=0, le=100)
    alert_cooldown_seconds: int | None = Field(default=None, ge=0, le=86_400)
    alert_top_n: int | None = Field(default=None, ge=1, le=10)
    alert_min_liquidity_usd: float | None = Field(default=None, ge=0)
    alert_max_vol_liq_ratio: float | None = Field(default=None, ge=0)
    alert_blocked_terms: list[str] | None = None
    alert_blocked_chains: list[str] | None = None
    alert_template: str | None = Field(default=None, max_length=2000)
    notes: str = Field(default="", max_length=1000)


class TaskStatusRequest(BaseModel):
    status: str


class SkillFindRequest(BaseModel):
    query: str = Field(min_length=1, max_length=120)


class SkillInstallRequest(BaseModel):
    package: str = Field(min_length=3, max_length=160)
    global_install: bool = True


def _task_filters_from_request(body: TaskCreateRequest) -> dict[str, Any] | None:
    filters: dict[str, Any] = {}
    if body.chains:
        filters["chains"] = list(parse_chains(body.chains))
    if body.limit is not None:
        filters["limit"] = body.limit
    if body.min_liquidity_usd is not None:
        filters["min_liquidity_usd"] = body.min_liquidity_usd
    if body.min_volume_h24_usd is not None:
        filters["min_volume_h24_usd"] = body.min_volume_h24_usd
    if body.min_txns_h1 is not None:
        filters["min_txns_h1"] = body.min_txns_h1
    if body.min_price_change_h1 is not None:
        filters["min_price_change_h1"] = body.min_price_change_h1
    return filters or None


def _task_alerts_from_request(body: TaskCreateRequest) -> dict[str, Any] | None:
    alerts: dict[str, Any] = {}
    if body.webhook_url:
        validate_webhook_url(body.webhook_url)
        alerts["webhook_url"] = body.webhook_url.strip()
    if body.discord_webhook_url:
        validate_webhook_url(body.discord_webhook_url)
        alerts["discord_webhook_url"] = body.discord_webhook_url.strip()
    if body.telegram_bot_token:
        alerts["telegram_bot_token"] = body.telegram_bot_token.strip()
    if body.telegram_chat_id:
        alerts["telegram_chat_id"] = body.telegram_chat_id.strip()
    if body.alert_min_score is not None:
        alerts["min_score"] = body.alert_min_score
    if body.alert_cooldown_seconds is not None:
        alerts["cooldown_seconds"] = body.alert_cooldown_seconds
    if body.alert_top_n is not None:
        alerts["top_n"] = body.alert_top_n
    if body.alert_min_liquidity_usd is not None:
        alerts["min_liquidity_usd"] = body.alert_min_liquidity_usd
    if body.alert_max_vol_liq_ratio is not None:
        alerts["max_vol_liq_ratio"] = body.alert_max_vol_liq_ratio
    if body.alert_blocked_terms:
        alerts["blocked_terms"] = [term.strip() for term in body.alert_blocked_terms if term.strip()]
    if body.alert_blocked_chains:
        alerts["blocked_chains"] = [chain.strip().lower() for chain in body.alert_blocked_chains if chain.strip()]
    if body.alert_template:
        alerts["template"] = body.alert_template
    return alerts or None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    runtime = WebRuntime()
    await runtime.startup()
    app.state.runtime = runtime
    try:
        yield
    finally:
        await runtime.shutdown()


app = FastAPI(
    title="AgentPyT Web Local",
    description="Local website companion for AgentPyT",
    version="0.1.0",
    lifespan=lifespan,
)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


def _runtime() -> WebRuntime:
    runtime = getattr(app.state, "runtime", None)
    if runtime is None:
        raise HTTPException(status_code=503, detail="Runtime not ready")
    return runtime


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, Any]:
    runtime = _runtime()
    config = runtime.get_config()
    return {
        "ok": True,
        "timestamp": datetime.now(UTC).isoformat(),
        "baseDir": str(runtime.base_dir),
        "cacheTtlSeconds": config.cache_ttl_seconds,
    }


@app.get("/api/config")
async def get_config() -> dict[str, Any]:
    runtime = _runtime()
    config = runtime.get_config()
    return {
        "config": config.to_dict(),
        "profiles": PROFILE_FILTERS,
        "knownChains": sorted(KNOWN_CHAINS),
        "stateDir": str(runtime.base_dir),
        "mcpCommand": str(_mcp_binary_path()),
    }


@app.patch("/api/config")
async def patch_config(body: ConfigPatchRequest) -> dict[str, Any]:
    runtime = _runtime()
    patch = body.model_dump(exclude_none=True)
    if "default_chains" in patch:
        patch["default_chains"] = list(parse_chains(patch["default_chains"]))
    updated = await runtime.update_config(patch)
    return {"config": updated.to_dict()}


@app.post("/api/scan/hot")
async def scan_hot(body: ScanRequest) -> dict[str, Any]:
    runtime = _runtime()
    try:
        if body.profile:
            profile = body.profile.strip().lower()
            if profile not in PROFILE_FILTERS:
                raise ValueError(f"Unknown profile '{body.profile}'")
            profile_values = PROFILE_FILTERS[profile]
        else:
            profile_values = {}
        filters = runtime.resolve_scan_filters(
            chains=body.chains,
            limit=body.limit,
            min_liquidity_usd=body.min_liquidity_usd or profile_values.get("min_liquidity_usd"),
            min_volume_h24_usd=body.min_volume_h24_usd or profile_values.get("min_volume_h24_usd"),
            min_txns_h1=body.min_txns_h1 or int(profile_values.get("min_txns_h1", 0)) or None,
            min_price_change_h1=body.min_price_change_h1,
            preset_name=body.preset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    candidates = await runtime.scan(filters)
    return {
        "filters": {
            "chains": list(filters.chains),
            "limit": filters.limit,
            "min_liquidity_usd": filters.min_liquidity_usd,
            "min_volume_h24_usd": filters.min_volume_h24_usd,
            "min_txns_h1": filters.min_txns_h1,
            "min_price_change_h1": filters.min_price_change_h1,
        },
        "count": len(candidates),
        "results": [serialize_candidate(row) for row in candidates],
    }


@app.get("/api/search")
async def search_pairs(
    query: str = Query(min_length=1, max_length=500),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    runtime = _runtime()
    rows = await runtime.search(query=query, limit=limit)
    return {"query": query, "count": len(rows), "results": [serialize_pair(pair) for pair in rows]}


@app.get("/api/inspect/{chain_id}/{token_address}")
async def inspect_token(chain_id: str, token_address: str) -> dict[str, Any]:
    runtime = _runtime()
    try:
        chains = parse_chains([chain_id])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    pairs = await runtime.inspect_token(chain_id=chains[0], token_address=token_address)
    if not pairs:
        raise HTTPException(status_code=404, detail="Token not found")
    best = pairs[0]
    candidate = HotTokenCandidate(
        pair=best,
        score=0.0,
        boost_total=0.0,
        boost_count=0,
        has_profile=False,
        discovery="inspect",
        tags=[],
    )
    probe = {
        "bestPair": serialize_pair(best),
        "additionalPairCount": max(0, len(pairs) - 1),
        "distributionProxy": build_distribution_heuristics(candidate),
    }
    return probe


@app.get("/api/rate-stats")
async def rate_stats(
    seed_query: str | None = Query(default=None, max_length=120),
    chain_id: str | None = Query(default=None, max_length=32),
    token_address: str | None = Query(default=None, max_length=128),
) -> dict[str, Any]:
    runtime = _runtime()
    stats = await runtime.runtime_stats(seed_query=seed_query, chain_id=chain_id, token_address=token_address)
    return {"stats": stats}


@app.get("/api/presets")
async def list_presets() -> dict[str, Any]:
    runtime = _runtime()
    rows = runtime.list_presets()
    return {"count": len(rows), "items": [row.to_dict() for row in rows]}


@app.post("/api/presets")
async def save_preset(body: PresetSaveRequest) -> dict[str, Any]:
    runtime = _runtime()
    try:
        filters = runtime.resolve_scan_filters(
            chains=body.chains,
            limit=body.limit,
            min_liquidity_usd=body.min_liquidity_usd,
            min_volume_h24_usd=body.min_volume_h24_usd,
            min_txns_h1=body.min_txns_h1,
            min_price_change_h1=body.min_price_change_h1,
        )
        preset = runtime.save_preset(name=body.name, filters=filters)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"item": preset.to_dict()}


@app.delete("/api/presets/{name}")
async def delete_preset(name: str) -> dict[str, Any]:
    runtime = _runtime()
    runtime.delete_preset(name)
    return {"ok": True}


@app.get("/api/tasks")
async def list_tasks(status: str | None = Query(default=None)) -> dict[str, Any]:
    runtime = _runtime()
    if status and status not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Status must be todo/running/done/blocked")
    rows = runtime.list_tasks(status=status)
    return {"count": len(rows), "items": [StateStore._redact_task(task.to_dict()) for task in rows]}


@app.post("/api/tasks")
async def create_task(body: TaskCreateRequest) -> dict[str, Any]:
    runtime = _runtime()
    try:
        task = runtime.create_task(
            name=body.name,
            preset=body.preset,
            filters=_task_filters_from_request(body),
            interval_seconds=body.interval_seconds,
            alerts=_task_alerts_from_request(body),
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"item": StateStore._redact_task(task.to_dict())}


@app.patch("/api/tasks/{task_name_or_id}/status")
async def update_task_status(task_name_or_id: str, body: TaskStatusRequest) -> dict[str, Any]:
    runtime = _runtime()
    if body.status not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Status must be todo/running/done/blocked")
    try:
        task = runtime.update_task_status(task_name_or_id, status=body.status)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"item": StateStore._redact_task(task.to_dict())}


@app.delete("/api/tasks/{task_name_or_id}")
async def delete_task(task_name_or_id: str) -> dict[str, Any]:
    runtime = _runtime()
    try:
        runtime.delete_task(task_name_or_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/api/tasks/{task_name_or_id}/run")
async def run_task(task_name_or_id: str, fire_alerts: bool = Query(default=True)) -> dict[str, Any]:
    runtime = _runtime()
    try:
        result = await runtime.run_task_once(task_name_or_id, fire_alerts=fire_alerts)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    candidates = result.get("candidates", [])
    if isinstance(candidates, list):
        serialized_candidates = [serialize_candidate(row) for row in candidates]
    else:
        serialized_candidates = []
    return {
        "ok": bool(result.get("ok")),
        "error": result.get("error"),
        "task": result.get("task"),
        "filters": result.get("filters"),
        "run": result.get("run"),
        "alert": result.get("alert"),
        "count": len(serialized_candidates),
        "results": serialized_candidates,
    }


@app.post("/api/tasks/run-due")
async def run_due_tasks(
    default_interval_seconds: int = Query(default=120, ge=15, le=86_400),
    fire_alerts: bool = Query(default=True),
) -> dict[str, Any]:
    runtime = _runtime()
    result = await runtime.run_due_tasks(default_interval_seconds=default_interval_seconds, fire_alerts=fire_alerts)
    normalized_runs: list[dict[str, Any]] = []
    for run in result["runs"]:
        candidates = run.get("candidates", [])
        serialized = [serialize_candidate(row) for row in candidates] if isinstance(candidates, list) else []
        normalized_runs.append(
            {
                "ok": run.get("ok", False),
                "error": run.get("error"),
                "task": run.get("task"),
                "filters": run.get("filters"),
                "run": run.get("run"),
                "alert": run.get("alert"),
                "count": len(serialized),
                "top": serialized[0] if serialized else None,
            }
        )
    return {"due": result["due"], "runs": normalized_runs}


@app.get("/api/task-runs")
async def list_task_runs(task: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)) -> dict[str, Any]:
    runtime = _runtime()
    rows = runtime.state_store.list_runs(task=task, limit=limit)
    return {"count": len(rows), "items": [row.to_dict() for row in rows]}


@app.get("/api/mcp/config")
async def get_mcp_config() -> dict[str, Any]:
    payload = _mcp_server_payload()
    return {
        "command": str(_mcp_binary_path()),
        "payload": payload,
        "json": json.dumps(payload, indent=2),
        "tips": [
            "Copy payload into claude_desktop_config.json or .mcp.json",
            "Use the exact venv binary path generated by your local install",
        ],
    }


@app.post("/api/mcp/config/write")
async def write_mcp_config() -> dict[str, Any]:
    path = BASE_DIR / ".mcp.json"
    payload = _mcp_server_payload()
    merged = payload
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(current, dict):
                servers = current.get("mcpServers", {})
                if isinstance(servers, dict):
                    servers.update(payload["mcpServers"])
                    current["mcpServers"] = servers
                    merged = current
        except json.JSONDecodeError:
            merged = payload
    path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return {"ok": True, "path": str(path), "payload": merged}


@app.get("/api/skills/recommendations")
async def skill_recommendations() -> dict[str, Any]:
    return {
        "items": [
            {
                "name": "vercel-labs/agent-skills@vercel-react-best-practices",
                "reason": "Frontend performance and modern React architecture",
            },
            {
                "name": "ComposioHQ/awesome-claude-skills@playwright-testing",
                "reason": "E2E testing flow for local dashboards",
            },
            {
                "name": "ComposioHQ/awesome-claude-skills@openapi-authoring",
                "reason": "Maintain API contracts for MCP and web clients",
            },
        ]
    }


@app.post("/api/skills/find")
async def find_skills(body: SkillFindRequest) -> dict[str, Any]:
    try:
        query = _sanitize_skills_query(body.query)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        result = _run_skills_command(["find", query])
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@app.post("/api/skills/install")
async def install_skill(body: SkillInstallRequest) -> dict[str, Any]:
    try:
        package = _sanitize_skill_package(body.package)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    args = ["add", package, "-y"]
    if body.global_install:
        args.append("-g")
    try:
        result = _run_skills_command(args)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@app.get("/api/watch/stream")
async def watch_stream(
    chains: str = Query(default=",".join(DEFAULT_CHAINS)),
    preset: str | None = Query(default=None),
    profile: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=100),
    min_liquidity_usd: float | None = Query(default=None, ge=0),
    min_volume_h24_usd: float | None = Query(default=None, ge=0),
    min_txns_h1: int | None = Query(default=None, ge=0),
    min_price_change_h1: float | None = Query(default=None),
    interval: float | None = Query(default=None, ge=2.0, le=120.0),
) -> StreamingResponse:
    runtime = _runtime()
    chain_list = [chain.strip() for chain in chains.split(",") if chain.strip()]
    config = runtime.get_config()
    loop_interval = interval or float(config.watch_interval_seconds)
    profile_values = PROFILE_FILTERS.get(profile.strip().lower(), {}) if profile else {}
    try:
        filters = runtime.resolve_scan_filters(
            chains=chain_list,
            limit=limit,
            min_liquidity_usd=min_liquidity_usd or profile_values.get("min_liquidity_usd"),
            min_volume_h24_usd=min_volume_h24_usd or profile_values.get("min_volume_h24_usd"),
            min_txns_h1=min_txns_h1 or int(profile_values.get("min_txns_h1", 0)) or None,
            min_price_change_h1=min_price_change_h1,
            preset_name=preset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async def _generator() -> AsyncGenerator[str, None]:
        while True:
            now = datetime.now(UTC).isoformat()
            try:
                rows = await runtime.scan(filters)
                payload = {
                    "timestamp": now,
                    "filters": {
                        "chains": list(filters.chains),
                        "limit": filters.limit,
                        "min_liquidity_usd": filters.min_liquidity_usd,
                        "min_volume_h24_usd": filters.min_volume_h24_usd,
                        "min_txns_h1": filters.min_txns_h1,
                        "min_price_change_h1": filters.min_price_change_h1,
                    },
                    "count": len(rows),
                    "results": [serialize_candidate(row) for row in rows],
                }
                yield f"event: scan\ndata: {json.dumps(payload)}\n\n"
            except Exception as exc:
                payload = {"timestamp": now, "error": str(exc)}
                yield f"event: error\ndata: {json.dumps(payload)}\n\n"
            await asyncio.sleep(loop_interval)

    return StreamingResponse(_generator(), media_type="text/event-stream")


def main() -> None:
    import uvicorn

    uvicorn.run(
        "pyagentt_cli.web_api:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
    )


if __name__ == "__main__":
    main()
