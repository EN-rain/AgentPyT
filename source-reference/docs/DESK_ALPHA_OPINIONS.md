# Trading Insights & Implementation Notes

> Best practices distilled from experienced momentum traders

## Core Principles

### 1. Noise Reduction Over Signal Amplification

**The Insight:** Most "alpha" is actually false-positive rejection.

**Implementation:**
- Strict liquidity gates (`$25K+` for runners)
- Anti-thin filters (max volume/liquidity ratio)
- Risk scoring with automatic penalties

### 2. Simple Momentum Signatures Work Best

**Focus on three signals:**
1. **Volume acceleration** — Is trading activity increasing?
2. **Breakout continuation** — Is momentum sustaining?
3. **Buy/sell pressure** — Is flow one-sided?

**Avoid:** Over-complicated indicators that obscure price action.

### 3. Hard Guardrails Save Accounts

**Real-time alert requirements:**
- Cooldown periods between alerts
- Maximum alerts per hour
- Risk gates for thin/concentrated tokens

**Result:** Fewer, higher-quality alerts.

---

## Current Default Settings

### Runner Scans
```bash
./pyagentt new-runners \
  --min-liquidity-usd 25000 \
  --max-vol-liq-ratio 60
```

**Rationale:** $25K liquidity prevents getting stuck in ultra-thin pairs. 60x volume/liquidity ratio avoids unsustainable momentum.

### Alpha Drops
```bash
./pyagentt alpha-drops \
  --min-liquidity-usd 35000 \
  --min-volume-h24-usd 90000 \
  --min-txns-h1 80
```

**Rationale:** Higher bar for "alpha" classification — requires proven activity.

### Real-time Monitoring
```bash
./pyagentt alpha-drops-watch \
  --interval 6 \
  --alert-cooldown-seconds 300 \
  --alert-max-per-hour 8
```

**Rationale:** 6-second refresh balances responsiveness with API limits. 5-minute cooldown prevents spam. 8 alerts/hour is actionable without overwhelming.

---

## Terminal UX Best Practices

### Compact Layout
- Readable columns without horizontal scrolling
- Color hierarchy (green/red/cyan/gold/purple)
- Inline pulse cues for quick tape reading

### Information Density
- Primary table always visible
- Secondary summaries in compact panels
- Chain heat and market structure at a glance

---

## Multi-Chain Considerations

**Solana-heavy bias mitigation:**
- Search-seed discovery augments boost-based discovery
- Chain-aware profiles adjust thresholds per ecosystem
- Base, Ethereum, BSC get equal discovery weight

---

## Risk Management Reminders

1. **Always verify liquidity** — High volume with thin liquidity = trap
2. **Check holder distribution** — Concentrated holdings = manipulation risk
3. **Mind the age** — Newer pairs = higher volatility, higher risk
4. **Use cooldowns** — FOMO is expensive; alerts should be actionable

---

## Validation Workflow

Before trusting any signal:

1. **Scanner** — PyAgenT score and risk flags
2. **Safety check** — RugCheck.xyz or GoPlus
3. **Chart** — TradingView or DexScreener
4. **Community** — Twitter/X sentiment, Discord activity
5. **Execution** — Jupiter (Solana) or 1inch (EVM)

---

## Disclaimer

These insights reflect implementation choices in PyAgenT based on trader feedback. They are **not financial advice**. Always:

- Do your own research (DYOR)
- Never invest more than you can afford to lose
- Verify token safety before trading
- Be aware that past performance doesn't predict future results
