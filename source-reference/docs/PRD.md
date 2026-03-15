# Product Requirements Document

**Product:** PyAgenT  
**Version:** 1.0  
**Date:** March 2026  
**Status:** Production Ready

---

## 1. Executive Summary

PyAgenT is an AI-native cryptocurrency token scanner with a unique triple-interface architecture: terminal CLI, MCP server for AI agents, and web dashboard. It discovers and scores hot tokens across 8 blockchain networks using an 8-factor proprietary algorithm.

### Key Differentiators

| Feature | PyAgenT | Typical Scanner |
|---------|---------|-----------------|
| Interfaces | CLI + MCP + Web | Usually single |
| AI Integration | Native MCP support | Rare/absent |
| Scoring | 8-factor algorithm | Basic volume sorting |
| Rate Handling | Intelligent limiting | Often hits limits |
| Multi-chain | 8 chains, unified view | Usually 1-2 chains |

---

## 2. Problem Statement

Crypto traders face three friction points:

1. **Browser-based scanners are slow** — Tab switching, manual refresh, no automation
2. **Existing CLI tools are basic** — Simple sorting, no scoring, no AI integration
3. **AI assistants can't interact** — No standardized way for Claude/Codex to scan tokens

---

## 3. Goals

### Primary Goals

1. Enable sub-5-second token discovery across multiple chains
2. Provide operator-grade terminal interface for power users
3. Expose full functionality via MCP for AI agent integration
4. Maintain 99%+ uptime under rate limits (60/300 RPM)

### Secondary Goals

1. Support automated task scheduling with alerts
2. Enable custom filter presets for repeat workflows
3. Provide browser-based alternative for non-terminal users

---

## 4. Non-Goals

| Out of Scope | Rationale |
|--------------|-----------|
| Trade execution | Security, regulatory complexity |
| Wallet integration | Scope creep, key management risk |
| Guaranteed alpha predictions | Market unpredictability |
| True holder distribution | Public API limitations |
| Mobile app | Web dashboard covers mobile use |

---

## 5. Target Users

### Primary: Momentum Traders
- **Profile:** Active meme/altcoin traders
- **Pain:** Missing early pumps due to slow discovery
- **Usage:** Live watch mode, Discord alerts

### Secondary: Quant Developers
- **Profile:** Algorithmic traders, bot builders
- **Pain:** No structured JSON API for scanners
- **Usage:** MCP integration, `--json` output, webhook alerts

### Tertiary: Cross-Chain Explorers
- **Profile:** DeFi researchers, chain analysts
- **Pain:** Fragmented tools per chain
- **Usage:** Multi-chain scans, holder aggregation

---

## 6. User Stories

### US-1: Quick Hot Scan
> As a trader, I want to see trending tokens in under 5 seconds so I can act on momentum.

**Acceptance Criteria:**
- `./pyagentt hot` returns results in < 5s
- Top 20 tokens ranked by score
- Color-coded momentum indicators

### US-2: AI-Assisted Discovery
> As a developer, I want my AI assistant to scan tokens via natural language.

**Acceptance Criteria:**
- "What's hot on Solana?" returns scored tokens
- "Find Base gems under $10K liquidity" works
- MCP tools documented and discoverable

### US-3: Automated Monitoring
> As a trader, I want alerts when high-quality tokens appear.

**Acceptance Criteria:**
- Create task with filters
- Discord/Telegram webhook support
- Configurable cooldown to prevent spam

### US-4: Custom Workflows
> As a power user, I want to save my filter preferences.

**Acceptance Criteria:**
- Save named presets
- Load preset in any scan command
- Export/import for backup

### US-5: Browser Alternative
> As a casual user, I want a visual interface without terminal.

**Acceptance Criteria:**
- Web dashboard at localhost:8765
- All CLI features accessible
- Live streaming without page refresh

---

## 7. Functional Requirements

### FR-1: Token Discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Pull seeds from AgentPyT boosts endpoint | P0 |
| FR-1.2 | Pull seeds from token profiles endpoint | P0 |
| FR-1.3 | Expand seeds to full pair data | P0 |
| FR-1.4 | Search-based discovery for under-covered chains | P1 |
| FR-1.5 | Community takeover detection | P2 |

### FR-2: Scoring Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | 8-factor weighted scoring | P0 |
| FR-2.2 | Risk profiling (liquidity, turnover, concentration) | P0 |
| FR-2.3 | Momentum decay tracking | P1 |
| FR-2.4 | Chain-relative strength calculation | P1 |
| FR-2.5 | Boost velocity detection | P2 |

### FR-3: Interfaces

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | CLI with 20+ commands | P0 |
| FR-3.2 | MCP server with 15+ tools | P0 |
| FR-3.3 | Web dashboard with SSE streaming | P1 |
| FR-3.4 | JSON output mode for scripting | P0 |

### FR-4: State Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Save/load named presets | P0 |
| FR-4.2 | Create/manage scan tasks | P0 |
| FR-4.3 | Task execution history | P1 |
| FR-4.4 | State export/import | P2 |

### FR-5: Alerts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Discord webhook support | P0 |
| FR-5.2 | Telegram bot support | P1 |
| FR-5.3 | Generic webhook support | P1 |
| FR-5.4 | Alert cooldown/throttling | P0 |
| FR-5.5 | Test alert functionality | P0 |

---

## 8. Non-Functional Requirements

### NFR-1: Performance

| Metric | Target |
|--------|--------|
| Scan latency | < 5 seconds |
| API throughput | 300 RPM (respecting limits) |
| Memory usage | < 100MB baseline |
| Concurrent tasks | 20 parallel workers |

### NFR-2: Reliability

| Metric | Target |
|--------|--------|
| Rate limit compliance | 100% (no bans) |
| Retry success rate | > 95% after transient failures |
| Cache hit rate | 60-80% in live mode |

### NFR-3: Compatibility

| Requirement | Target |
|-------------|--------|
| Python version | 3.11+ |
| Operating systems | Windows, macOS, Linux |
| Terminal width | 100+ columns optimal |
| Browsers | Chrome, Firefox, Safari, Edge |

### NFR-4: Security

| Requirement | Implementation |
|-------------|----------------|
| No private keys | Read-only operations only |
| Path validation | Regex-based segment validation |
| SSRF prevention | Webhook URL allowlisting |
| Input sanitization | Bounded types on all inputs |

---

## 9. Success Metrics

### User Experience
- Time to first scan: < 3 minutes (setup → result)
- Watch mode stability: 30+ minutes without rate errors
- Task creation success: > 90% first-try

### Technical
- API compliance: Zero rate-limit bans
- Uptime: > 99% for daemon deployment
- Test coverage: > 80%

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AgentPyT API changes | Medium | High | Defensive parsing, graceful degradation |
| Market volatility bursts | High | Medium | Bounded fanout, caching, backoff |
| Misinterpretation of metrics | Medium | Medium | Clear labeling, heuristic warnings |
| MCP protocol changes | Low | Medium | Abstract MCP layer, version pinning |

---

## 11. Open Questions

1. Should we add Solana-specific holder APIs (SolanaFM, Solscan)?
2. Is there demand for historical data/backtesting?
3. Should we integrate with TradingView for chart links?
4. Is a hosted SaaS version viable?

---

## 12. Appendix

### A. Chain Support Matrix

| Chain | Status | Holder Data Sources |
|-------|--------|---------------------|
| Solana | ✅ Full | GeckoTerminal, Moralis |
| Base | ✅ Full | GeckoTerminal, Moralis, Blockscout |
| Ethereum | ✅ Full | GeckoTerminal, Moralis, Blockscout, Honeypot.is |
| BSC | ✅ Full | GeckoTerminal, Moralis, Honeypot.is |
| Arbitrum | ✅ Full | GeckoTerminal, Moralis, Honeypot.is |
| Polygon | ✅ Full | GeckoTerminal, Moralis, Honeypot.is |
| Optimism | ✅ Full | GeckoTerminal, Moralis, Honeypot.is |
| Avalanche | ✅ Full | GeckoTerminal, Moralis, Honeypot.is |

### B. API Rate Limits

| Endpoint Category | RPM | Bucket |
|-------------------|-----|--------|
| token-boosts/* | 60 | slow |
| token-profiles/* | 60 | slow |
| orders/* | 60 | slow |
| search | 300 | fast |
| token-pairs/* | 300 | fast |
| pairs/* | 300 | fast |
