const { useEffect, useMemo, useRef, useState } = React;

const ALL_CHAINS = ["solana", "base", "ethereum", "bsc", "arbitrum", "polygon", "optimism", "avalanche"];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.detail || payload?.error || "Request failed";
    throw new Error(message);
  }
  return payload;
}

function money(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000_000) return `$${(number / 1_000_000_000).toFixed(2)}B`;
  if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(2)}M`;
  if (number >= 1_000) return `$${(number / 1_000).toFixed(2)}K`;
  return `$${number.toFixed(2)}`;
}

function formatPrice(value) {
  const number = Number(value || 0);
  if (number >= 1) return number.toFixed(4);
  if (number >= 0.01) return number.toFixed(6);
  return number.toFixed(10);
}

function App() {
  const [chainChecks, setChainChecks] = useState({
    solana: true,
    base: true,
    ethereum: true,
    bsc: true,
    arbitrum: false,
    polygon: false,
    optimism: false,
    avalanche: false,
  });

  const [profile, setProfile] = useState("");
  const [preset, setPreset] = useState("");
  const [limit, setLimit] = useState(20);
  const [minLiq, setMinLiq] = useState(20000);
  const [minVol, setMinVol] = useState(40000);
  const [minTx, setMinTx] = useState(25);
  const [minPct, setMinPct] = useState(-10);
  const [watchInterval, setWatchInterval] = useState(5);

  const [results, setResults] = useState([]);
  const [scanMeta, setScanMeta] = useState("No scan yet");
  const [healthPill, setHealthPill] = useState({ text: "Checking runtime...", className: "neutral" });
  const [watchPill, setWatchPill] = useState({ text: "Live watch: stopped", className: "neutral" });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [inspectChain, setInspectChain] = useState("solana");
  const [inspectAddress, setInspectAddress] = useState("");
  const [inspectOutput, setInspectOutput] = useState("");

  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([]);

  const [taskName, setTaskName] = useState("");
  const [taskInterval, setTaskInterval] = useState(60);
  const [tasks, setTasks] = useState([]);

  const watchRef = useRef(null);
  const selectedChains = useMemo(
    () => ALL_CHAINS.filter((chain) => chainChecks[chain]),
    [chainChecks],
  );

  const setError = (error) => {
    setHealthPill({ text: String(error?.message || error), className: "bad" });
  };

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
    const data = await apiRequest("/api/scan/hot", {
      method: "POST",
      body: JSON.stringify(scanPayload()),
    });
    setResults(data.results || []);
    setScanMeta(`${data.count} rows | ${new Date().toLocaleTimeString()}`);
  };

  const stopWatch = () => {
    if (watchRef.current) {
      watchRef.current.close();
      watchRef.current = null;
    }
    setWatchPill({ text: "Live watch: stopped", className: "neutral" });
  };

  const startWatch = () => {
    stopWatch();
    const payload = scanPayload();
    const params = new URLSearchParams({
      chains: payload.chains.join(","),
      limit: String(payload.limit),
      min_liquidity_usd: String(payload.min_liquidity_usd),
      min_volume_h24_usd: String(payload.min_volume_h24_usd),
      min_txns_h1: String(payload.min_txns_h1),
      min_price_change_h1: String(payload.min_price_change_h1),
      interval: String(Number(watchInterval) || 5),
    });
    if (payload.profile) params.set("profile", payload.profile);
    if (payload.preset) params.set("preset", payload.preset);
    const source = new EventSource(`/api/watch/stream?${params.toString()}`);
    source.addEventListener("scan", (event) => {
      const body = JSON.parse(event.data);
      setResults(body.results || []);
      setScanMeta(`${body.count} rows | live ${new Date(body.timestamp).toLocaleTimeString()}`);
      setWatchPill({ text: "Live watch: active", className: "ok" });
    });
    source.addEventListener("error", () => {
      setWatchPill({ text: "Live watch: reconnecting", className: "neutral" });
    });
    source.onerror = () => {
      setWatchPill({ text: "Live watch: reconnecting", className: "neutral" });
    };
    watchRef.current = source;
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    const data = await apiRequest(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=12`);
    setSearchResults(data.results || []);
  };

  const runInspect = async () => {
    if (!inspectAddress.trim()) return;
    const data = await apiRequest(`/api/inspect/${encodeURIComponent(inspectChain)}/${encodeURIComponent(inspectAddress)}`);
    setInspectOutput(JSON.stringify(data, null, 2));
  };

  const loadPresets = async () => {
    const data = await apiRequest("/api/presets");
    setPresets(data.items || []);
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    const payload = scanPayload();
    await apiRequest("/api/presets", {
      method: "POST",
      body: JSON.stringify({
        name: presetName.trim(),
        chains: payload.chains,
        limit: payload.limit,
        min_liquidity_usd: payload.min_liquidity_usd,
        min_volume_h24_usd: payload.min_volume_h24_usd,
        min_txns_h1: payload.min_txns_h1,
        min_price_change_h1: payload.min_price_change_h1,
      }),
    });
    setPresetName("");
    await loadPresets();
  };

  const deletePreset = async (name) => {
    await apiRequest(`/api/presets/${encodeURIComponent(name)}`, { method: "DELETE" });
    await loadPresets();
  };

  const loadTasks = async () => {
    const data = await apiRequest("/api/tasks");
    setTasks(data.items || []);
  };

  const createTask = async () => {
    if (!taskName.trim()) return;
    const payload = scanPayload();
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        name: taskName.trim(),
        preset: payload.preset,
        chains: payload.chains,
        limit: payload.limit,
        min_liquidity_usd: payload.min_liquidity_usd,
        min_volume_h24_usd: payload.min_volume_h24_usd,
        min_txns_h1: payload.min_txns_h1,
        min_price_change_h1: payload.min_price_change_h1,
        interval_seconds: Number(taskInterval) || 60,
      }),
    });
    setTaskName("");
    await loadTasks();
  };

  const runTask = async (taskId) => {
    const data = await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}/run`, { method: "POST" });
    setResults(data.results || []);
    setScanMeta(`Task run ${taskId} | ${data.count} rows`);
  };

  const deleteTask = async (taskId) => {
    await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
    await loadTasks();
  };

  const runDueTasks = async () => {
    const data = await apiRequest("/api/tasks/run-due", { method: "POST" });
    setScanMeta(`Due tasks executed: ${data.due}`);
    await loadTasks();
  };

  const loadHealth = async () => {
    const data = await apiRequest("/api/health");
    setHealthPill({ text: `Runtime OK | cache TTL ${data.cacheTtlSeconds}s`, className: "ok" });
  };

  const loadConfig = async () => {
    const data = await apiRequest("/api/config");
    setWatchInterval(data.config.watch_interval_seconds || 5);
  };

  const runAction = async (fn) => {
    try {
      await fn();
    } catch (error) {
      setError(error);
    }
  };

  useEffect(() => {
    runAction(async () => {
      await loadHealth();
      await loadConfig();
      await loadPresets();
      await loadTasks();
    });
    return () => {
      stopWatch();
    };
  }, []);

  const resultCount = results.length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>PyAgentT Scanner</h1>
          <p className="muted">Local workspace for scans, watch streams, presets, and scheduled runs.</p>
        </div>
        <div className="topbar-meta">
          <span className={`status-chip ${healthPill.className}`}>{healthPill.text}</span>
          <span className={`status-chip ${watchPill.className}`}>{watchPill.text}</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar panel">
          <div className="panel-section">
              <div className="section-header">
                <h2>Filters</h2>
              </div>
              <div className="field-grid single">
                <label>Chains</label>
                <div className="checks">
                  {ALL_CHAINS.map((chain) => (
                    <label key={chain} className="check-item">
                      <input
                        type="checkbox"
                        checked={chainChecks[chain]}
                        onChange={(event) => setChainChecks((prev) => ({ ...prev, [chain]: event.target.checked }))}
                      />
                      <span>{chain}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field-grid filter-grid">
                <label>
                  Profile
                  <div className="select-wrap">
                    <select value={profile} onChange={(event) => setProfile(event.target.value)}>
                      <option value="">custom</option>
                      <option value="discovery">discovery</option>
                      <option value="balanced">balanced</option>
                      <option value="strict">strict</option>
                    </select>
                  </div>
                </label>
                <label>
                  Preset
                  <input value={preset} onChange={(event) => setPreset(event.target.value)} type="text" placeholder="optional preset name" />
                </label>
                <label>
                  Result limit
                  <input value={limit} onChange={(event) => setLimit(event.target.value)} type="number" min="1" max="100" />
                </label>
                <label>
                  Watch interval
                  <input value={watchInterval} onChange={(event) => setWatchInterval(event.target.value)} type="number" min="2" max="120" />
                </label>
                <label>
                  Min liquidity USD
                  <input value={minLiq} onChange={(event) => setMinLiq(event.target.value)} type="number" min="0" />
                </label>
                <label>
                  Min volume 24h USD
                  <input value={minVol} onChange={(event) => setMinVol(event.target.value)} type="number" min="0" />
                </label>
                <label>
                  Min txns 1h
                  <input value={minTx} onChange={(event) => setMinTx(event.target.value)} type="number" min="0" />
                </label>
                <label>
                  Min price change 1h
                  <input value={minPct} onChange={(event) => setMinPct(event.target.value)} type="number" />
                </label>
              </div>
              <div className="button-row">
                <button className="primary" onClick={() => runAction(runScan)}>Run scan</button>
                <button onClick={() => runAction(startWatch)}>Start watch</button>
                <button className="danger" onClick={stopWatch}>Stop watch</button>
              </div>
          </div>

          <div className="panel-section summary-list">
            <div className="summary-row">
              <span>Selected chains</span>
              <strong>{selectedChains.length}</strong>
            </div>
            <div className="summary-row">
              <span>Loaded presets</span>
              <strong>{presets.length}</strong>
            </div>
            <div className="summary-row">
              <span>Scheduled tasks</span>
              <strong>{tasks.length}</strong>
            </div>
            <div className="summary-row">
              <span>Visible results</span>
              <strong>{resultCount}</strong>
            </div>
          </div>
        </aside>

        <section className="content">
          <section className="panel">
            <div className="results-header">
              <div className="section-header no-margin">
                <div>
                  <h2>Results</h2>
                  <p className="muted meta-line">{scanMeta}</p>
                </div>
              </div>
              <div className="results-summary muted mono">
                <span>{resultCount} rows</span>
                <span>{selectedChains.join(" | ")}</span>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Token</th>
                    <th>Chain</th>
                    <th>Score</th>
                    <th>Price</th>
                    <th>1h</th>
                    <th>Volume 24h</th>
                    <th>Liquidity</th>
                    <th>Txns 1h</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="empty-cell">No scan results yet.</td>
                    </tr>
                  ) : (
                    results.map((row, idx) => (
                      <tr key={`${row.chainId}:${row.tokenAddress}:${idx}`}>
                        <td>{idx + 1}</td>
                        <td className="token-cell">
                          <strong>{row.tokenSymbol || "?"}</strong>
                          <span className="muted mono">{row.tokenAddress}</span>
                        </td>
                        <td>{row.chainId}</td>
                        <td className={row.score >= 70 ? "score-good" : row.score < 40 ? "score-bad" : ""}>{Number(row.score || 0).toFixed(2)}</td>
                        <td>{formatPrice(row.priceUsd)}</td>
                        <td>{Number(row.priceChangeH1 || 0).toFixed(2)}%</td>
                        <td>{money(row.volumeH24)}</td>
                        <td>{money(row.liquidityUsd)}</td>
                        <td>{row.txnsH1 || 0}</td>
                        <td>{(row.tags || []).join(", ") || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="content-grid">
            <section className="panel">
              <div className="section-header">
                <h2>Search</h2>
              </div>
              <div className="inline-form">
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="text" placeholder="pepe or token address" />
                <button onClick={() => runAction(runSearch)}>Search</button>
              </div>
              {searchResults.length === 0 ? (
                <p className="empty-state">No search results yet.</p>
              ) : (
                <div className="list">
                  {searchResults.map((row, idx) => (
                    <div className="list-item" key={`${row.chainId}:${row.tokenAddress}:${idx}`}>
                      <div>
                        <strong>{row.tokenSymbol}</strong>
                        <div className="muted mono">{row.chainId} | {row.tokenAddress}</div>
                      </div>
                      <div className="list-metric mono">{money(row.volumeH24)} / {money(row.liquidityUsd)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <h2>Inspect</h2>
              </div>
              <div className="inline-form">
                <div className="select-wrap">
                  <select value={inspectChain} onChange={(event) => setInspectChain(event.target.value)}>
                    {ALL_CHAINS.map((chain) => (
                      <option key={chain} value={chain}>{chain}</option>
                    ))}
                  </select>
                </div>
                <input value={inspectAddress} onChange={(event) => setInspectAddress(event.target.value)} type="text" placeholder="token address" />
                <button onClick={() => runAction(runInspect)}>Inspect</button>
              </div>
              {inspectOutput ? (
                <pre className="mono pre">{inspectOutput}</pre>
              ) : (
                <p className="empty-state">No inspect output yet.</p>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <h2>Presets</h2>
              </div>
              <div className="inline-form">
                <input value={presetName} onChange={(event) => setPresetName(event.target.value)} type="text" placeholder="new preset name" />
                <button onClick={() => runAction(savePreset)}>Save current filters</button>
              </div>
              {presets.length === 0 ? (
                <p className="empty-state">No presets saved.</p>
              ) : (
                <div className="list">
                  {presets.map((item) => (
                    <div className="list-item" key={item.name}>
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted mono">{(item.chains || []).join(", ")} | limit {item.limit}</div>
                      </div>
                      <button onClick={() => runAction(() => deletePreset(item.name))}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <h2>Tasks</h2>
              </div>
              <div className="inline-form">
                <input value={taskName} onChange={(event) => setTaskName(event.target.value)} type="text" placeholder="task name" />
                <input value={taskInterval} onChange={(event) => setTaskInterval(event.target.value)} type="number" min="15" />
                <button onClick={() => runAction(createTask)}>Create task</button>
              </div>
              <div className="inline-form compact-actions">
                <button onClick={() => runAction(runDueTasks)}>Run due tasks</button>
                <button onClick={() => runAction(loadTasks)}>Refresh</button>
              </div>
              {tasks.length === 0 ? (
                <p className="empty-state">No tasks created.</p>
              ) : (
                <div className="list">
                  {tasks.map((item) => (
                    <div className="list-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted mono">{item.status} | every {item.interval_seconds || 120}s | preset {item.preset || "-"}</div>
                      </div>
                      <div className="button-row compact">
                        <button onClick={() => runAction(() => runTask(item.id))}>Run</button>
                        <button onClick={() => runAction(() => deleteTask(item.id))}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
