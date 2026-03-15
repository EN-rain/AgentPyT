# Web Dashboard Guide

> Browser-based interface for PyAgenT — same engine, visual control

## 🚀 Quick Start

```bash
# Start the web server
./pyagentt-web          # Unix
pyagentt-web.bat        # Windows

# Or via Python
python -m pyagentt_cli.web_api
```

**Open:** http://127.0.0.1:8765

## ✨ Features

| Feature | CLI Equivalent | Web Advantage |
|---------|---------------|---------------|
| Hot Scan | `./pyagentt hot` | Visual filters, one-click execute |
| Live Watch | `./pyagentt watch` | Browser notifications, background friendly |
| Search | `./pyagentt search` | Auto-complete, clickable results |
| Presets | `./pyagentt preset` | Form-based creation, visual list |
| Tasks | `./pyagentt task` | Calendar-like scheduling view |
| MCP Config | Manual JSON editing | One-click `.mcp.json` generator |

## 📡 API Endpoints

### Scanning

```bash
# Hot scan with filters
POST /api/scan/hot
{
  "chains": ["solana", "base"],
  "profile": "discovery",
  "limit": 20
}

# Search pairs
GET /api/search?query=pepe&limit=20

# Inspect token
GET /api/inspect/solana/So11111111111111111111111111111111111111112
```

### Live Streaming

```bash
# SSE stream for live dashboards
GET /api/watch/stream?chains=solana,base&interval=5

# Response: text/event-stream
event: scan
data: {"timestamp": "...", "results": [...]}
```

### Presets

```bash
GET    /api/presets              # List all
POST   /api/presets              # Create
DELETE /api/presets/{name}        # Delete
```

### Tasks

```bash
GET    /api/tasks                # List all
POST   /api/tasks                # Create
PATCH  /api/tasks/{id}/status    # Update status
POST   /api/tasks/{id}/run       # Execute now
DELETE /api/tasks/{id}           # Delete
```

### System

```bash
GET /api/health           # Health check
GET /api/config           # Current configuration
PATCH /api/config         # Update settings
GET /api/rate-stats       # API usage statistics
GET /api/mcp/config       # MCP configuration payload
```

## ⚙️ Configuration

Web-specific settings are stored in:

```
~/.pyagentt/web_config.json
```

**Fields:**

| Field | Default | Description |
|-------|---------|-------------|
| `cache_ttl_seconds` | 10 | API response cache duration |
| `default_chains` | ["solana", "base"] | Default chains for scans |
| `watch_interval_seconds` | 10 | Live refresh interval |
| `default_limit` | 20 | Default result count |

**Update via API:**
```bash
PATCH /api/config
{
  "cache_ttl_seconds": 15,
  "default_chains": ["solana", "ethereum"]
}
```

## 🔌 MCP Configuration

The web dashboard can generate your `.mcp.json` file:

1. Navigate to **"Cache + MCP Config"** panel
2. Click **"Write .mcp.json"**
3. File is created at `<repo>/.mcp.json`

**Generated payload:**
```json
{
  "mcpServers": {
    "pyagentt": {
      "command": "/path/to/.venv/bin/pyagentt-mcp",
      "args": []
    }
  }
}
```

## 🎯 React Frontend

**Location:** `web/index.html` + `web/assets/app.jsx`

**Key Components:**
- `ScanPanel` — One-shot scan interface
- `WatchStream` — SSE streaming display
- `PresetManager` — CRUD for presets
- `TaskScheduler` — Task creation & execution
- `McpConfigPanel` — MCP configuration

**Styling:** Tailwind-like utility classes in `styles.css`

## 🧪 Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run with auto-reload
uvicorn pyagentt_cli.web_api:app --reload --port 8765

# Run tests
pytest tests/test_web_api.py -v
```

**Test Coverage:**
- Endpoint validation
- SSE streaming
- Error handling
- Security (SSRF, input validation)

## 📊 Performance Notes

| Scenario | Behavior |
|----------|----------|
| Multiple tabs | Shared runtime, deduplicated API calls |
| Background tab | SSE continues, throttled by browser |
| Mobile | Responsive layout, touch-friendly controls |
| Slow network | 10s cache helps, configurable TTL |

## 🔒 Security

- CORS restricted to localhost
- Input validation on all endpoints
- Webhook URL validation (SSRF protection)
- No authentication (local-only by design)

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8765 in use | `lsof -ti:8765 \| xargs kill -9` |
| Static assets 404 | Check `web/assets/` exists |
| SSE not updating | Check browser console for errors |
| Config not saving | Verify `~/.pyagentt/` is writable |
