const { useEffect, useMemo, useRef, useState } = React;

const ALL_CHAINS = ["solana", "base", "ethereum", "bsc", "arbitrum", "polygon", "optimism", "avalanche"];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const ct = response.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const msg = typeof payload === "string" ? payload : payload?.detail || payload?.error || "Request failed";
    throw new Error(msg);
  }
  return payload;
}

function money(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(value) {
  const n = Number(value || 0);
  if (n >= 1)    return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(6);
  return n.toFixed(10);
}

function scoreTier(s) {
  const n = Number(s || 0);
  if (n >= 70) return "score-good";
  if (n >= 40) return "score-mid";
  return "score-bad";
}

function ScoreBar({ score }) {
  const s = Math.min(100, Math.max(0, Number(score || 0)));
  const tier = scoreTier(s);
  return (
    <div className={`score-wrap ${tier}`}>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${s}%` }} />
      </div>
      <span className="score-val">{s.toFixed(1)}</span>
    </div>
  );
}

function ChainPill({ chain }) {
  return <span className={`chain-pill ${chain}`}>{chain}</span>;
}

function Change({ value }) {
  const n = Number(value || 0);
  const cls = n >= 0 ? "change-up" : "change-down";
  return <span className={cls}>{n >= 0 ? "+" : ""}{n.toFixed(2)}%</span>;
}

function Dropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find((o) => o.value === value) || { label: placeholder || "Select..." };

  return (
    <div className={`custom-dropdown ${open ? "open" : ""}`} ref={ref}>
      <div className="dropdown-trigger" onClick={() => setOpen(!open)}>
        <span>{selected.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-arrow">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {open && (
        <div className="dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`dropdown-option ${opt.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
              {opt.value === value && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-check">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [chainChecks, setChainChecks] = useState({
    solana: true, base: true, ethereum: true, bsc: true,
    arbitrum: false, polygon: false, optimism: false, avalanche: false,
  });

  const [profile, setProfile]             = useState("");
  const [preset, setPreset]               = useState("");
  const [limit, setLimit]                 = useState(20);
  const [minLiq, setMinLiq]               = useState(20000);
  const [minVol, setMinVol]               = useState(40000);
  const [minTx, setMinTx]                 = useState(25);
  const [minPct, setMinPct]               = useState(-10);
  const [watchInterval, setWatchInterval] = useState(5);

  const [results, setResults]       = useState([]);
  const [scanMeta, setScanMeta]     = useState("No scan yet");
  const [loading, setLoading]       = useState(false);
  const [healthPill, setHealthPill] = useState({ text: "Connecting…", className: "neutral" });
  const [watchPill, setWatchPill]   = useState({ text: "Idle", className: "neutral" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError]     = useState("");
  const [inspectChain, setInspectChain]   = useState("solana");
  const [inspectAddress, setInspectAddress] = useState("");
  const [inspectOutput, setInspectOutput]   = useState("");

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets]       = useState([]);
  const [taskName, setTaskName]     = useState("");
  const [taskInterval, setTaskInterval] = useState(60);
  const [tasks, setTasks]           = useState([]);

  const watchRef = useRef(null);
  const selectedChains = useMemo(() => ALL_CHAINS.filter((c) => chainChecks[c]), [chainChecks]);

  const setError = (e) => setHealthPill({ text: String(e?.message || e), className: "bad" });

  const scanPayload = () => ({
    chains: selectedChains,
    profile: profile || null,
    preset: preset.trim() || null,
    limit: Number(limit),
    min_liquidity_usd: Number(minLiq),
    min_volume_h24_usd: Number(minVol),
    min_txns_h1: Number(minTx),
    min_price_change_h1: Number(minPct),
  });

  const runScan = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/scan/hot", { method: "POST", body: JSON.stringify(scanPayload()) });
      setResults(data.results || []);
      setScanMeta(`${data.count} tokens · ${new Date().toLocaleTimeString()}`);
    } catch (e) { setError(e); }
    setLoading(false);
  };

  const stopWatch = () => {
    if (watchRef.current) { watchRef.current.close(); watchRef.current = null; }
    setWatchPill({ text: "Idle", className: "neutral" });
  };

  const startWatch = () => {
    stopWatch();
    const p = scanPayload();
    const params = new URLSearchParams({
      chains: p.chains.join(","), limit: String(p.limit),
      min_liquidity_usd: String(p.min_liquidity_usd),
      min_volume_h24_usd: String(p.min_volume_h24_usd),
      min_txns_h1: String(p.min_txns_h1),
      min_price_change_h1: String(p.min_price_change_h1),
      interval: String(Number(watchInterval) || 5),
    });
    if (p.profile) params.set("profile", p.profile);
    if (p.preset)  params.set("preset", p.preset);

    const src = new EventSource(`/api/watch/stream?${params.toString()}`);
    src.addEventListener("scan", (ev) => {
      const body = JSON.parse(ev.data);
      setResults(body.results || []);
      setScanMeta(`${body.count} tokens · live ${new Date(body.timestamp).toLocaleTimeString()}`);
      setWatchPill({ text: "Live", className: "ok" });
    });
    const onErr = () => setWatchPill({ text: "Reconnecting...", className: "neutral" });
    src.addEventListener("error", onErr);
    src.onerror = onErr;
    watchRef.current = src;
    setWatchPill({ text: "Connecting…", className: "neutral" });
  };

  const runAction = async (fn) => { try { await fn(); } catch (e) { setError(e); } };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (searchError) setSearchError("");
  };

  const runSearch  = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError("Enter a token name, symbol, or address before searching.");
      return;
    }

    try {
      const d = await apiRequest(`/api/search?query=${encodeURIComponent(query)}&limit=12`);
      setSearchResults(d.results || []);
      setSearchError("");
    } catch (e) {
      setSearchResults([]);
      setSearchError(String(e?.message || e));
    }
  };
  const runInspect = async () => {
    if (!inspectAddress.trim()) return;
    const d = await apiRequest(`/api/inspect/${encodeURIComponent(inspectChain)}/${encodeURIComponent(inspectAddress)}`);
    setInspectOutput(JSON.stringify(d, null, 2));
  };

  const loadPresets  = async () => { const d = await apiRequest("/api/presets"); setPresets(d.items || []); };
  const savePreset   = async () => {
    if (!presetName.trim()) return;
    const p = scanPayload();
    await apiRequest("/api/presets", { method: "POST", body: JSON.stringify({ name: presetName.trim(), chains: p.chains, limit: p.limit, min_liquidity_usd: p.min_liquidity_usd, min_volume_h24_usd: p.min_volume_h24_usd, min_txns_h1: p.min_txns_h1, min_price_change_h1: p.min_price_change_h1 }) });
    setPresetName(""); await loadPresets();
  };
  const deletePreset = async (n) => { await apiRequest(`/api/presets/${encodeURIComponent(n)}`, { method: "DELETE" }); await loadPresets(); };

  const loadTasks    = async () => { const d = await apiRequest("/api/tasks"); setTasks(d.items || []); };
  const createTask   = async () => {
    if (!taskName.trim()) return;
    const p = scanPayload();
    await apiRequest("/api/tasks", { method: "POST", body: JSON.stringify({ name: taskName.trim(), preset: p.preset, chains: p.chains, limit: p.limit, min_liquidity_usd: p.min_liquidity_usd, min_volume_h24_usd: p.min_volume_h24_usd, min_txns_h1: p.min_txns_h1, min_price_change_h1: p.min_price_change_h1, interval_seconds: Number(taskInterval) || 60 }) });
    setTaskName(""); await loadTasks();
  };
  const runTask      = async (id) => { const d = await apiRequest(`/api/tasks/${encodeURIComponent(id)}/run`, { method: "POST" }); setResults(d.results || []); setScanMeta(`Task ${id} · ${d.count} tokens`); };
  const deleteTask   = async (id) => { await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadTasks(); };
  const runDueTasks  = async () => { const d = await apiRequest("/api/tasks/run-due", { method: "POST" }); setScanMeta(`Due tasks: ${d.due} run`); await loadTasks(); };

  const loadHealth = async () => { const d = await apiRequest("/api/health"); setHealthPill({ text: `Runtime OK · TTL ${d.cacheTtlSeconds}s`, className: "ok" }); };
  const loadConfig = async () => { const d = await apiRequest("/api/config"); setWatchInterval(d.config.watch_interval_seconds || 5); };

  useEffect(() => {
    runAction(async () => { await loadHealth(); await loadConfig(); await loadPresets(); await loadTasks(); });
    return () => stopWatch();
  }, []);

  // Aggregate stats from results
  const avgScore = results.length
    ? (results.reduce((s, r) => s + Number(r.score || 0), 0) / results.length).toFixed(1)
    : "—";
  const topToken = results[0]?.tokenSymbol || "—";

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>

      {/* ═══════════ TOP BAR ═══════════ */}
      <header className="topbar">
        <div className="topbar-brand">
          <button
            type="button"
            className="nav-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-expanded={!sidebarCollapsed}
            aria-controls="left-sidebar"
          >
            {sidebarCollapsed ? "Show Filters" : "Hide Filters"}
          </button>
          <h1><span className="logo-dot" />&nbsp;AgentPyT</h1>
        </div>

        {/* Centre — action buttons always visible */}
        <div className="topbar-center">
          <div className="topbar-actions btn-group">
            <button id="btn-run-scan" className="primary" onClick={runScan} disabled={loading}>
              {loading ? "Scanning…" : "Run Scan"}
            </button>
            <button id="btn-watch" className="secondary" onClick={startWatch}>Watch</button>
            <button id="btn-stop" className="danger" onClick={stopWatch}>Stop</button>
          </div>
        </div>

        {/* Right — status */}
        <div className="topbar-meta">
          <span className={`status-chip ${healthPill.className}`}>{healthPill.text}</span>
          <span className={`status-chip ${watchPill.className}`}>{watchPill.text}</span>
        </div>
      </header>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside id="left-sidebar" className="sidebar">

        {/* Networks */}
        <div className="panel-section">
          <div className="section-label">Networks</div>
          <div className="checks">
            {ALL_CHAINS.map((chain) => (
              <label key={chain} className="check-item">
                <input
                  type="checkbox"
                  checked={chainChecks[chain]}
                  onChange={(e) => setChainChecks((prev) => ({ ...prev, [chain]: e.target.checked }))}
                />
                {chain}
              </label>
            ))}
          </div>
        </div>

        {/* Scan Profile */}
        <div className="panel-section">
          <div className="section-label">Profile &amp; Preset</div>
          <div className="filter-grid">
            <label className="full" style={{ zIndex: 11, position: "relative" }}>
              Profile
              <Dropdown 
                value={profile} 
                onChange={setProfile}
                options={[
                  { value: "", label: "custom" },
                  { value: "discovery", label: "discovery" },
                  { value: "balanced", label: "balanced" },
                  { value: "strict", label: "strict" },
                ]}
              />
            </label>
            <label className="full">
              Preset
              <input value={preset} onChange={(e) => setPreset(e.target.value)} type="text" placeholder="optional name" />
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="panel-section">
          <div className="section-label">Filters</div>
          <div className="filter-grid">
            <label>
              Limit
              <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min="1" max="100" />
            </label>
            <label>
              Interval (s)
              <input value={watchInterval} onChange={(e) => setWatchInterval(e.target.value)} type="number" min="2" max="120" />
            </label>
            <label>
              Min Liq $
              <input value={minLiq} onChange={(e) => setMinLiq(e.target.value)} type="number" min="0" />
            </label>
            <label>
              Min Vol 24h $
              <input value={minVol} onChange={(e) => setMinVol(e.target.value)} type="number" min="0" />
            </label>
            <label>
              Min Txns 1h
              <input value={minTx} onChange={(e) => setMinTx(e.target.value)} type="number" min="0" />
            </label>
            <label>
              Min Chg 1h %
              <input value={minPct} onChange={(e) => setMinPct(e.target.value)} type="number" />
            </label>
          </div>
        </div>

        {/* Session stats */}
        <div className="panel-section" style={{ flex: 1 }}>
          <div className="section-label">Session</div>
          <div className="summary-list">
            <div className="summary-row"><span>Chains</span><strong>{selectedChains.length}</strong></div>
            <div className="summary-row"><span>Presets</span><strong>{presets.length}</strong></div>
            <div className="summary-row"><span>Tasks</span><strong>{tasks.length}</strong></div>
            <div className="summary-row"><span>Tokens</span><strong>{results.length}</strong></div>
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="content">

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Tokens Found</span>
            <span className={`stat-value ${results.length > 0 ? "green" : "dim"}`}>{results.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Score</span>
            <span className="stat-value">{avgScore}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Top Token</span>
            <span className="stat-value" style={{ fontSize: "12px" }}>{topToken}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Update</span>
            <span className="stat-value dim">{scanMeta}</span>
          </div>
          <div className="stat-chains">
            {selectedChains.map((c) => <ChainPill key={c} chain={c} />)}
          </div>
        </div>

        {/* Scrollable results + lower panels */}
        <div className="content-scroll">

          {/* Results table */}
          <div className="results-pane">
            {results.length === 0 ? (
              <div className="empty-table">
                <div>No scan results yet</div>
                <div className="empty-table-hint">Hit <strong>Run Scan</strong> or <strong>Watch</strong> in the toolbar above</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Token</th>
                      <th>Chain</th>
                      <th>Score</th>
                      <th>Price</th>
                      <th>1h %</th>
                      <th style={{ textAlign: "right" }}>Vol 24h</th>
                      <th style={{ textAlign: "right" }}>Liquidity</th>
                      <th style={{ textAlign: "right" }}>Txns/1h</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={`${row.chainId}:${row.tokenAddress}:${idx}`}>
                        <td className="rank">{idx + 1}</td>
                        <td>
                          <div className="token-cell">
                            <span className="token-symbol">{row.tokenSymbol || "?"}</span>
                            <span className="token-addr">{row.tokenAddress}</span>
                          </div>
                        </td>
                        <td><ChainPill chain={row.chainId} /></td>
                        <td><ScoreBar score={row.score} /></td>
                        <td><span className="price-val mono">{formatPrice(row.priceUsd)}</span></td>
                        <td><Change value={row.priceChangeH1} /></td>
                        <td className="num-cell">{money(row.volumeH24)}</td>
                        <td className="num-cell">{money(row.liquidityUsd)}</td>
                        <td className="num-cell">{row.txnsH1 || 0}</td>
                        <td>
                          <div className="tag-list">
                            {(() => {
                              const tags = row.tags || [];
                              const visible = tags.slice(0, 4);
                              const extra = tags.length - visible.length;
                              if (tags.length === 0) return <span className="empty-cell">—</span>;
                              return (
                                <>
                                  {visible.map((t) => <span key={t} className="tag">{t}</span>)}
                                  {extra > 0 && <span className="tag-more">+{extra}</span>}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4-panel bottom grid */}
          <div className="content-grid">

            {/* Search */}
            <div className="grid-panel">
              <div className="section-header"><h2>Search Pairs</h2></div>
              <div className="inline-form">
                <input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  type="text"
                  className={searchError ? "field-error" : ""}
                  placeholder="Name, symbol, or address…"
                  aria-invalid={Boolean(searchError)}
                  aria-describedby={searchError ? "search-feedback" : undefined}
                />
                <button onClick={runSearch}>Search</button>
              </div>
              {searchError && (
                <div id="search-feedback" className="field-popup field-popup-error" role="alert">
                  {searchError}
                </div>
              )}
              {searchResults.length === 0 ? (
                searchError ? null : <div className="empty-state">No results — search above</div>
              ) : (
                <div className="item-list">
                  {searchResults.map((row, idx) => (
                    <div className="list-item" key={`sr-${idx}`}>
                      <div className="list-item-info">
                        <span className="list-item-name">{row.tokenSymbol}</span>
                        <span className="list-item-meta"><ChainPill chain={row.chainId} /> &nbsp;{row.tokenAddress}</span>
                      </div>
                      <span className="list-metric">{money(row.volumeH24)} / {money(row.liquidityUsd)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspect */}
            <div className="grid-panel">
              <div className="section-header"><h2>Deep Inspect</h2></div>
              <div className="inline-form">
                <div style={{ flex: "0 0 130px", zIndex: 10, position: "relative" }}>
                  <Dropdown 
                    value={inspectChain} 
                    onChange={setInspectChain}
                    options={ALL_CHAINS.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <input value={inspectAddress} onChange={(e) => setInspectAddress(e.target.value)} type="text" placeholder="Token address" />
                <button onClick={() => runAction(runInspect)}>Inspect</button>
              </div>
              {inspectOutput
                ? <pre className="pre">{inspectOutput}</pre>
                : <div className="empty-state">Enter a token address to deep-dive its metrics</div>
              }
            </div>

            {/* Presets */}
            <div className="grid-panel">
              <div className="section-header"><h2>Presets</h2></div>
              <div className="inline-form">
                <input value={presetName} onChange={(e) => setPresetName(e.target.value)} type="text" placeholder="Preset name…" />
                <button onClick={() => runAction(savePreset)}>Save filters</button>
              </div>
              {presets.length === 0 ? (
                <div className="empty-state">No presets saved — save current filters above</div>
              ) : (
                <div className="item-list">
                  {presets.map((item) => (
                    <div className="list-item" key={item.name}>
                      <div className="list-item-info">
                        <span className="list-item-name">{item.name}</span>
                        <span className="list-item-meta">{(item.chains || []).join(", ")} · limit {item.limit}</span>
                      </div>
                      <div className="list-item-actions">
                        <button onClick={() => runAction(() => deletePreset(item.name))}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="grid-panel">
              <div className="section-header"><h2>Scheduled Tasks</h2></div>
              <div className="inline-form">
                <input value={taskName} onChange={(e) => setTaskName(e.target.value)} type="text" placeholder="Task name…" />
                <input value={taskInterval} onChange={(e) => setTaskInterval(e.target.value)} type="number" min="15" style={{ flex: "0 0 64px" }} />
                <button onClick={() => runAction(createTask)}>Create</button>
              </div>
              <div className="btn-group" style={{ marginTop: 8 }}>
                <button onClick={() => runAction(runDueTasks)}>Run due</button>
                <button onClick={() => runAction(loadTasks)}>Refresh</button>
              </div>
              {tasks.length === 0 ? (
                <div className="empty-state">No tasks — create one above</div>
              ) : (
                <div className="item-list">
                  {tasks.map((item) => (
                    <div className="list-item" key={item.id}>
                      <div className="list-item-info">
                        <span className="list-item-name">{item.name}</span>
                        <span className="list-item-meta">{item.status} · {item.interval_seconds || 120}s · preset {item.preset || "—"}</span>
                      </div>
                      <div className="list-item-actions">
                        <button onClick={() => runAction(() => runTask(item.id))}>Run</button>
                        <button onClick={() => runAction(() => deleteTask(item.id))}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>{/* /content-grid */}
        </div>{/* /content-scroll */}
      </main>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
