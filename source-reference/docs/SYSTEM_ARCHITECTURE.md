# System Architecture

> Technical deep-dive into PyAgenT's multi-layer architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERFACE LAYER                                 │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│        CLI              │       MCP Server        │      Web Dashboard      │
│    (Typer + Rich)       │    (FastMCP + stdio)    │  (FastAPI + React)      │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • 20+ commands          │ • 15 tools              │ • 20+ REST endpoints    │
│ • Live watch modes      │ • 4 resources           │ • SSE streaming         │
│ • Keyboard controls     │ • 3 prompts             │ • React SPA             │
│ • Rich terminal UI      │ • Natural language      │ • Real-time dashboards  │
└──────────┬──────────────┴───────────┬─────────────┴──────────┬──────────────┘
           │                          │                        │
           └──────────────────────────┼────────────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │         ORCHESTRATION LAYER        │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │        HotScanner            │  │
                    │  │  ┌────────────────────────┐  │  │
                    │  │  │  Token Discovery       │  │  │
                    │  │  │  • Boost endpoints     │  │  │
                    │  │  │  • Profile endpoints   │  │  │
                    │  │  │  • Search expansion    │  │  │
                    │  │  └────────────────────────┘  │  │
                    │  │  ┌────────────────────────┐  │  │
                    │  │  │  Pair Resolution       │  │  │
                    │  │  │  • Best pair selection │  │  │
                    │  │  │  • Liquidity ranking   │  │  │
                    │  │  │  • Deduplication       │  │  │
                    │  │  └────────────────────────┘  │  │
                    │  │  ┌────────────────────────┐  │  │
                    │  │  │  Scoring Engine        │  │  │
                    │  │  │  • 8-factor algorithm  │  │  │
                    │  │  │  • Risk profiling      │  │  │
                    │  │  │  • Momentum tracking   │  │  │
                    │  │  └────────────────────────┘  │  │
                    │  └──────────────────────────────┘  │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │      State Management        │  │
                    │  │  • ScanPreset (JSON)         │  │
                    │  │  • ScanTask (JSON)           │  │
                    │  │  • TaskRun history           │  │
                    │  └──────────────────────────────┘  │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │       Task Scheduler         │  │
                    │  │  • Due task selection        │  │
                    │  │  • Alert dispatch            │  │
                    │  │  • Run persistence           │  │
                    │  └──────────────────────────────┘  │
                    └────────────────────────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │           CLIENT LAYER             │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │    DexScreenerClient         │  │
                    │  │                                │  │
                    │  │  • httpx.AsyncClient           │  │
                    │  │  • SlidingWindowLimiter (×2)   │  │
                    │  │    - Slow: 60 RPM              │  │
                    │  │    - Fast: 300 RPM             │  │
                    │  │  • TTL Cache (10s default)     │  │
                    │  │  • Exponential backoff         │  │
                    │  │  • Circuit breaker pattern     │  │
                    │  └──────────────────────────────┘  │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │    HolderDataAggregator      │  │
                    │  │                                │  │
                    │  │  • GeckoTerminal (primary)     │  │
                    │  │  • Moralis (optional)          │  │
                    │  │  • Blockscout (EVM fallback)   │  │
                    │  │  • Honeypot.is (EVM fallback)  │  │
                    │  └──────────────────────────────┘  │
                    └────────────────────────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │          DATA SOURCES              │
                    │                                    │
                    │  AgentPyT API    GeckoTerminal    │
                    │  ├─ token-boosts  ├─ holder counts │
                    │  ├─ token-profiles └─ trending     │
                    │  ├─ token-pairs                    │
                    │  ├─ search                         │
                    │  └─ orders                         │
                    │                                    │
                    │  Blockscout      Honeypot.is       │
                    │  ├─ EVM holders  └─ EVM holders    │
                    │  └─ Base-specific                  │
                    │                                    │
                    │  Moralis (optional)                │
                    │  └─ Premium holder data            │
                    └────────────────────────────────────┘
```

## Component Deep-Dive

### 1. CLI Layer (`cli.py`)

**Responsibilities:**
- Command routing via Typer
- Filter resolution (presets → CLI args → defaults)
- Async scan orchestration
- Terminal rendering coordination
- Task lifecycle management

**Key Patterns:**
```python
# Filter resolution chain (highest → lowest priority)
CLI args > Preset > Default preset > Config defaults

# Async execution
async def _scan(filters: ScanFilters) -> list[HotTokenCandidate]:
    async with DexScreenerClient() as client:
        scanner = HotScanner(client)
        return await scanner.scan(filters)
```

### 2. MCP Layer (`mcp_server.py`)

**Responsibilities:**
- Tool registration via FastMCP
- Input validation & sanitization
- Serialization for LLM consumption
- Quickstart command generation

**Tool Categories:**
| Category | Tools |
|----------|-------|
| Scanning | `scan_hot_tokens`, `search_pairs`, `inspect_token` |
| Presets | `save_preset`, `list_presets` |
| Tasks | `create_task`, `list_tasks`, `run_task_scan`, `run_due_tasks`, `test_task_alert` |
| System | `get_rate_budget_stats`, `export_state_bundle`, `import_state_bundle`, `get_cli_quickstart` |

### 3. Scanner Engine (`scanner.py`)

**Discovery Flow:**
```
1. Collect Seeds (parallel)
   ├── token-boosts/top
   ├── token-boosts/latest
   ├── token-profiles/latest
   ├── community-takeovers/latest
   └── search-based discovery (trending queries)

2. Prefetch Pairs (batched)
   └── /tokens/v1/{chain}/{addr1,addr2,...} (max 30 per call)

3. Expand & Filter (bounded concurrency)
   └── token-pairs/{chain}/{token} for missing pairs

4. Score & Rank
   └── 8-factor algorithm with risk adjustment

5. Hydrate Holders
   └── Multi-provider holder count enrichment
```

**Concurrency Model:**
```python
semaphore = asyncio.Semaphore(20)  # Max 20 concurrent pair expansions

async def worker(seed: _SeedToken) -> None:
    async with semaphore:
        pair = await fetch_pair(seed)
        if passes_filters(pair):
            results.append(score_candidate(pair))
```

### 4. Scoring Engine (`scoring.py`)

**8-Factor Weighting:**
```
Score = Σ(component × weight)

Volume Velocity      × 30  (log-scaled 24h volume)
Transaction Velocity × 20  (1h txns vs baseline)
Liquidity Depth      × 18  (pool health)
Momentum             × 12  (1h price change)
Flow Pressure        ×  8  (buy/sell imbalance)
Boost Velocity       ×  7  (promotion activity)
Recency              ×  3  (pair age)
Profile              ×  2  (official listing)
```

**Risk Adjustment:**
```python
# Risk flags: low-liquidity, high-turnover, concentration-risk, etc.
risk_score, risk_penalty, flags = _risk_profile(pair)
final_score = base_score - risk_penalty
```

### 5. Rate Limiting (`client.py`)

**Sliding Window Implementation:**
```python
class SlidingWindowLimiter:
    def __init__(self, rpm: int):
        self._max_calls = rpm
        self._window_seconds = 60.0
        self._calls: deque[float] = deque()
    
    async def acquire(self) -> None:
        # Remove expired timestamps
        # Wait if at capacity
        # Record new call timestamp
```

**Bucket Strategy:**
| Endpoint Category | RPM | Examples |
|-------------------|-----|----------|
| Slow | 60 | token-boosts, token-profiles, orders |
| Fast | 300 | search, token-pairs, pair details |

### 6. State Persistence (`state.py`)

**Storage Layout:**
```
~/.pyagentt/
├── presets.json      # ScanPreset[]
├── tasks.json        # ScanTask[]
├── runs.json         # TaskRun[]
└── web_config.json   # WebUI settings
```

**Entity Relationships:**
```
ScanTask --references--> ScanPreset (optional)
   │
   └──creates--> TaskRun (execution history)
```

### 7. Web Layer (`web_api.py` + `web_runtime.py`)

**FastAPI Endpoints:**
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/scan/hot` | POST | One-shot scan with filters |
| `/api/watch/stream` | GET | SSE live streaming |
| `/api/search` | GET | Pair search |
| `/api/inspect/{chain}/{token}` | GET | Token deep-dive |
| `/api/presets` | CRUD | Preset management |
| `/api/tasks` | CRUD | Task management |
| `/api/tasks/{id}/run` | POST | Execute task |
| `/api/watch/stream` | GET | SSE streaming |

**SSE Stream Format:**
```
event: scan
data: {"timestamp": "...", "count": 20, "results": [...]}

event: error
data: {"timestamp": "...", "error": "..."}
```

## Data Flow Diagrams

### Hot Scan Flow
```
User → CLI/MCP/Web → HotScanner.scan()
                          │
                          ▼
                  ┌───────────────┐
                  │ _collect_seeds │
                  │   (parallel)   │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │_prefetch_pairs│
                  │   (batched)   │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  _enrich_candidates
                  │ (bounded async)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   scoring +   │
                  │   ranking     │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │hydrate_pair_holders
                  └───────┬───────┘
                          │
                          ▼
                       Return
```

### Live Watch Flow
```
User → ./pyagentt watch --chain solana
            │
            ▼
    ┌───────────────┐
    │  Rich.Live    │◄──── keyboard input
    │  Dashboard    │      (watch_controls.py)
    └───────┬───────┘
            │
            ▼ (every N seconds)
    ┌───────────────┐
    │  HotScanner   │
    │  .scan()      │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Diff Engine   │──► Detect changes
    │ (transitions) │    (score/volume/price)
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Render Update │──► Highlight changes
    │   (colors)    │    (green=up, red=down)
    └───────────────┘
```

## Security Considerations

1. **Path Traversal Prevention**
   ```python
   _SAFE_PATH_SEGMENT = re.compile(r'^[a-zA-Z0-9_\-]+$')
   def _validate_path_segment(value: str, name: str) -> str:
       if not _SAFE_PATH_SEGMENT.match(value):
           raise ValueError(f"Invalid {name}")
   ```

2. **SSRF Protection**
   - Webhook URL validation with explicit allowlists
   - No arbitrary URL fetching

3. **Input Sanitization**
   - Bounded integers/floats on all MCP inputs
   - String length limits
   - Chain validation against known set

4. **No Private Keys**
   - Read-only market data
   - No wallet integration
   - No signing capabilities

## Performance Characteristics

| Metric | Target | Implementation |
|--------|--------|----------------|
| Scan Latency | < 5s | Parallel seeds + bounded fanout |
| API Throughput | 300 RPM | Sliding window limiter |
| Memory | < 100MB | Streaming JSON, bounded caches |
| Concurrent Tasks | 20 | Semaphore-controlled |
| Cache Hit Rate | 60-80% | 10s TTL on API responses |
| History Size | 2000 tokens | LRU eviction on momentum history |
