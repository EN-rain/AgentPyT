# PyAgentT Web Local Guide

This project now includes a local React website that recreates the CLI + MCP workflow in browser form.

## What Was Recreated

1. Same scanner engine and scoring pipeline as the CLI (`DexScreenerClient`, `HotScanner`, scoring, holder hydration).
2. Same local state model for presets/tasks/runs (`StateStore` in `~/.pyagentt` by default, with legacy fallback).
3. Same MCP binary integration (`pyagentt-mcp`) with generated `.mcp.json` payload.
4. Same alert-ready task system (Discord/Telegram/webhook config).
5. Cache control (`cache_ttl_seconds`) via persistent `web_config.json`.

## Step-by-Step Execution Plan (Implemented)

1. Read source docs and architecture (`README.md`, `SKILL.md`, `docs/PRD.md`, `docs/SYSTEM_ARCHITECTURE.md`).
2. Reuse core scanner modules and add a FastAPI web layer.
3. Build REST endpoints for scans, search/inspect, presets/tasks, task runs, rate stats.
4. Build live watch via SSE stream (`/api/watch/stream`).
5. Build local React UI with controls for scan, watch, presets, tasks, MCP config, and skills.
6. Add skill discovery/install API wrappers for `npx skills`.
7. Add MCP config write endpoint for `.mcp.json`.
8. Validate with automated tests.

## Run Locally

```bash
python -m pip install -e .
pyagentt-web
```

Then open:

```text
http://127.0.0.1:8765
```

## Key Web Endpoints

- `POST /api/scan/hot`
- `GET /api/watch/stream`
- `GET /api/search?query=...`
- `GET /api/inspect/{chain}/{tokenAddress}`
- `GET/POST/DELETE /api/presets`
- `GET/POST/PATCH/DELETE /api/tasks`
- `GET /api/task-runs`
- `GET /api/rate-stats`
- `GET/PATCH /api/config`
- `GET /api/mcp/config`
- `POST /api/mcp/config/write`
- `POST /api/skills/find`
- `POST /api/skills/install`

## Cache and Config

Web config is stored in:

```text
~/.pyagentt/web_config.json
```

Fields:

- `cache_ttl_seconds`
- `default_chains`
- `watch_interval_seconds`
- `default_limit`

## MCP Configuration

Use the web panel ("Cache + MCP Config") and click **Write .mcp.json**.
This writes or updates:

```text
<repo>/.mcp.json
```

with the local `pyagentt-mcp` command path.

## New Skills Workflow

Use the web panel ("New Skills") to:

1. Find skills (`npx skills find <query>`).
2. Install a skill (`npx skills add owner/repo@skill -g -y`).

The backend validates inputs before running those commands.

## Validation

Automated test status after rebuild:

- `77 passed, 1 skipped` (`pytest -q`)
