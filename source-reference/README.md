# PyAgentT - CLI + MCP + React Web

![PyAgentT CLI Screenshot](assets/screenshot.png)

**100% free to use.** All APIs included are public and free - no PyAgentT API key required to get started. Optional free Moralis key unlocks holder data.

A visual terminal scanner, MCP server, and AI skill for PyAgentT token signals. **Unofficial** - not affiliated with or endorsed by PyAgentT.

Scans hot tokens across every chain PyAgentT supports. Scores them by volume, liquidity, momentum, and flow pressure. Use it from the terminal, connect it to AI agents via MCP, or load it as a skill in Claude/Codex/OpenClaw.

---

## TL;DR - Get scanning in 60 seconds

**Windows:**
```
git clone https://github.com/your-org/PyAgentT.git
cd PyAgentT
install.bat
ds setup
ds hot
```

**Mac / Linux:**
```bash
git clone https://github.com/your-org/PyAgentT.git
cd PyAgentT
chmod +x install.sh && ./install.sh
./ds setup
./ds hot
```

That's it. After install you can just type `ds` (Windows) or `./ds` (Mac/Linux) from the project folder. No activation, no paths to remember.

---

## What's Installed

One install gives you everything:

| Component | What it is | How to use |
|-----------|-----------|------------|
| **CLI** (`ds`) | Terminal scanner and live dashboards - the primary product | `ds hot`, `ds watch`, `ds setup` |
| **MCP Server** (`pyagentt-mcp`) | Lets AI agents call the scanner in natural language | `pyagentt-mcp` (or configure in Claude/Codex) |
| **Skill file** (`SKILL.md`) | Teaches AI agents how to use the MCP and CLI | Point your agent at the file |
| **Local Website** (`pyagentt-web`) | React dashboard for scans/watch/presets/tasks/MCP config | `pyagentt-web` then open `http://127.0.0.1:8765` |

Think of it this way:
- **CLI** = best live experience and fastest workflows
- **MCP** = lets an AI agent operate the scanner for you
- **Skill** = teaches the agent when to use MCP vs sending you to the CLI
- **Web** = local control center for scan + live + task ops without terminal flags

---

## Install

You need **Python 3.11+** and **Git**. That's it.

<details>
<summary><strong>Never used a terminal before? Click here first.</strong></summary>

### Windows: how to open Command Prompt

1. Press the `Windows` key
2. Type `Command Prompt`
3. Click the app named `Command Prompt`

You should see a window with a prompt like:

```text
C:\Users\YOUR_NAME>
```

### macOS: how to open Terminal

Press `Cmd + Space`, type `Terminal`, press `Enter`.

### Linux: how to open Terminal

Open your desktop's `Terminal` app from the application menu.

</details>

### Step 1: Clone the repo

Open a terminal and paste this:

```bash
git clone https://github.com/your-org/PyAgentT.git
cd PyAgentT
```

### Step 2: Run the installer

**Windows:**
```
install.bat
```

**Mac / Linux:**
```bash
chmod +x install.sh && ./install.sh
```

This creates a virtual environment, installs all dependencies, and runs diagnostics automatically. Takes about 30 seconds.

### Step 3: Set up your preferences

```
ds setup
```

Asks you 5 quick questions (which chains, trading style, etc.) and saves your defaults. Takes 30 seconds.

### Step 4: Start scanning

```
ds hot
```

That's it. You're scanning.

### Step 5 (optional): Run the local website

**Windows:**
```cmd
pyagentt-web.bat
```

**Mac / Linux:**
```bash
./pyagentt-web
```

Then open:

```text
http://127.0.0.1:8765
```

### Running commands

After install, short wrapper scripts let you skip the `.venv` path entirely:

| Platform | Command style | Example |
|----------|--------------|---------|
| **Windows** | `ds <command>` | `ds hot --chains=solana` |
| **Mac / Linux** | `./ds <command>` | `./ds hot --chains=solana` |

You can always use the full path if you prefer: `.\.venv\Scripts\ds.exe` (Windows) or `./.venv/bin/ds` (Mac/Linux).

<details>
<summary>Manual install (if the script doesn't work)</summary>

```bash
python -m venv .venv
```

Activate the environment:
```bash
# Mac / Linux:
source .venv/bin/activate

# Windows Command Prompt:
.venv\Scripts\activate.bat

# Windows PowerShell:
.venv\Scripts\Activate.ps1
```

Then install:
```bash
pip install -e .
```
</details>

---

## Your First Live Dashboard

If you only run one more command after setup, make it this:

**Windows:**
```cmd
ds new-runners-watch --chain=solana --watch-chains=solana,base --profile=discovery --max-age-hours=48 --include-unknown-age --interval=2
```

**Mac / Linux:**
```bash
./ds new-runners-watch --chain=solana --watch-chains=solana,base --profile=discovery --max-age-hours=48 --include-unknown-age --interval=2
```

This is the best live mode. It auto-refreshes, shows rank movers and spotlight cards, and lets you switch chains with `1`/`2` keys. Press `Ctrl+C` to stop.

### Common Windows mistake

If you see `Option '--profile' requires an argument`, you pressed Enter too early. The whole command needs to be on **one line**. Using `=` signs (like `--profile=discovery`) helps because the option and value stay glued together.

---

## What Can I Do With This?

### "I just want to see what's hot right now"
```bash
ds hot
```

### "I only care about Solana"
```bash
ds hot --chains solana --limit 10
```

### "Show me tokens on Base too"
```bash
ds hot --chains solana,base --limit 15
```

### "I want a live feed that updates automatically"
```bash
ds new-runners-watch --chain=solana --watch-chains=solana,base --profile=discovery --max-age-hours=48 --include-unknown-age --interval=2
```

### "Show me brand new tokens that just launched"
```bash
ds new-runners --chain solana
ds top-new --chain base
```

### "Find me alpha - new drops with breakout potential"
```bash
ds alpha-drops --chains solana,base
```

### "Search for a specific token"
```bash
ds search pepe
ds search 0x6982508145454ce325ddbe47a25d4ec3d2311933
```

### "I found a token, give me everything on it"
```bash
ds inspect So11111111111111111111111111111111111111112 --chain solana
```

### "Alert me on Discord when something hot appears"
```bash
ds task create my-alerts --preset scout --interval-seconds 60
ds task configure my-alerts --discord-webhook-url https://discord.com/api/webhooks/YOUR/WEBHOOK
ds task test-alert my-alerts
ds task daemon --all
```

### "I want JSON output for my own scripts"
```bash
ds hot --json
ds hot --chains solana --limit 5 --json > tokens.json
```

---

## Commands

### Scans

| Command | What it does |
|---------|-------------|
| `ds hot` | Scan hot tokens across your configured chains |
| `ds search <query>` | Search tokens by name, symbol, or address |
| `ds top-new` | Top new tokens by 24h volume |
| `ds new-runners` | Fresh token runners with momentum scoring |
| `ds alpha-drops` | Alpha-grade new drops with breakout scoring |
| `ds ai-top` | AI-themed token leaderboard |
| `ds inspect <address>` | Deep-dive on a specific token |

### Live Dashboards

Three live modes that auto-refresh and keep your terminal updated. Press `Ctrl+C` to stop any of them.

| Command | What it does |
|---------|-------------|
| `ds watch` | Live hot runner board (simplest) |
| `ds new-runners-watch` | Full-screen new runner tracker with keyboard controls (recommended) |
| `ds alpha-drops-watch` | Live alpha drop scanner with optional Discord/Telegram alerts |

**Tips for all live modes:**
- `--interval 5` for slower, less chatty refreshes (default is 2 seconds)
- `--limit` to control how many tokens show (fewer = faster)
- `--profile discovery` to cast a wider net
- `1`/`2` keys to switch chains (if `--watch-chains` is set)
- `s` to cycle sort mode, `j/k` to navigate, `c` to copy address

### Local Website

| Command | What it does |
|---------|-------------|
| `pyagentt-web.bat` / `./pyagentt-web` | Start local dashboard on `http://127.0.0.1:8765` |

Web UI includes:
- one-shot hot scans with profile/preset filters
- live watch stream (SSE)
- search + inspect panels
- preset/task CRUD and due-task execution
- cache TTL config and MCP `.mcp.json` generation
- skill discovery/install wrappers using `npx skills`

Detailed walkthrough: [`docs/WEB_LOCAL_GUIDE.md`](docs/WEB_LOCAL_GUIDE.md)

### Setup & Maintenance

| Command | What it does |
|---------|-------------|
| `ds setup` | Pick your chains and preferences (5 quick questions) |
| `ds quickstart` | Print exact copy-paste commands for your shell |
| `ds doctor` | Diagnose issues and verify your setup |
| `ds update` | Pull latest code and reinstall |
| `pyagentt-web.bat` / `./pyagentt-web` | Launch local website dashboard |

<details>
<summary><strong>More commands (profiles, tasks, import/export)</strong></summary>

### Custom Scan Profiles

Create your own scan profiles with any combination of chains and filters. They persist across sessions.

```bash
# Create a custom profile
ds preset save my-degen --chains solana,base --limit 15 --min-liquidity-usd 8000 --min-txns-h1 5

# Use it in any scan
ds hot --preset my-degen
ds watch --preset my-degen

# List / inspect / delete profiles
ds preset list
ds preset show my-degen
ds preset delete my-degen
```

The 3 built-in profiles (strict / balanced / discovery) are always available. Your custom profiles sit on top.

### Tasks & Alerts

Set up automated scans that run on a schedule and alert you via Discord, Telegram, or webhooks.

| Command | What it does |
|---------|-------------|
| `ds task create <name>` | Create a scheduled scan task |
| `ds task list` | List all tasks |
| `ds task show <name>` | Show one task as JSON |
| `ds task status <name> <status>` | Change task status (`todo`, `running`, `done`, `blocked`) |
| `ds task delete <name>` | Delete a task |
| `ds task configure <name>` | Add alerts or edit schedule/filter overrides |
| `ds task run <name>` | Run a task once |
| `ds task daemon` | Run scheduler for all due tasks |
| `ds task test-alert <name>` | Send a test alert |
| `ds task runs` | List task execution history |

### Import / Export State

| Command | What it does |
|---------|-------------|
| `ds state export --path backup.json` | Export presets, tasks, and runs to one JSON file |
| `ds state import --path backup.json` | Import presets, tasks, and runs from a JSON file |

### Additional Commands

| Command | What it does |
|---------|-------------|
| `ds profiles` | Show built-in filter thresholds per chain |
| `ds rate-stats` | Show runtime API usage, limits, and cache timing |
| `ds why` | Explain why the project uses PyAgentT and what it optimizes for |
| `ds god-prompt` | Print the repo's long-form extension prompt for AI-assisted development |

### JSON Output

Use `--json` on supported one-shot commands for machine-readable output:

```bash
ds hot --json
ds search pepe --json
ds inspect So11111111111111111111111111111111111111112 --chain solana --json
```

</details>

---

## MCP Server - Use It With AI Agents

The MCP server lets you talk to your scanner in plain English through any AI agent. Instead of remembering CLI flags, you just ask:

- "What's pumping on Solana right now?"
- "Find me degen plays on Base with low liquidity"
- "Save a preset called sol-degen for Solana discovery mode"

### How to set it up

**Step 1:** Make sure the CLI is installed (see [Install](#install) above).

**Step 2:** Add the MCP server to your AI agent's config.

**Claude Desktop** - add to your `claude_desktop_config.json`:

Mac/Linux:
```json
{
  "mcpServers": {
    "pyagentt": {
      "command": "/path/to/PyAgentT/.venv/bin/pyagentt-mcp",
      "args": []
    }
  }
}
```

Windows:
```json
{
  "mcpServers": {
    "pyagentt": {
      "command": "C:\\path\\to\\PyAgentT\\.venv\\Scripts\\pyagentt-mcp.exe"
    }
  }
}
```

**Claude Code** - add to your `.mcp.json` or project settings:

Mac/Linux:
```json
{
  "mcpServers": {
    "pyagentt": {
      "command": "/path/to/PyAgentT/.venv/bin/pyagentt-mcp"
    }
  }
}
```

Windows:
```json
{
  "mcpServers": {
    "pyagentt": {
      "command": "C:\\path\\to\\PyAgentT\\.venv\\Scripts\\pyagentt-mcp.exe"
    }
  }
}
```

**Any MCP-compatible agent** (Codex, OpenClaw, etc.) - point it at the `pyagentt-mcp` binary in the `.venv` folder. It communicates over stdio.

**Step 3:** Start talking.

<details>
<summary><strong>Natural language examples and full MCP tool list</strong></summary>

### Natural language examples

| You say | What happens |
|---------|-------------|
| "What's hot right now?" | Scans all chains and returns top scored tokens |
| "Show me Solana tokens" | Scans Solana only |
| "Find tokens on Base with high volume" | Scans Base with volume-focused filters |
| "Search for pepe" | Searches PyAgentT for pepe tokens |
| "Tell me about this token: 0x..." | Inspects the specific token address |
| "Save my current settings as degen-mode" | Creates a named preset |
| "Set up a task that scans Solana every minute" | Creates a scheduled task |
| "Add Discord alerts to my task" | Configures alert channels on a task |
| "What are the API limits looking like?" | Shows rate budget and usage stats |

### All 15 MCP tools

| Tool | What it does |
|------|-------------|
| `scan_hot_tokens` | Scan and rank hot tokens by chain with scoring |
| `search_pairs` | Search pairs by name, symbol, or address |
| `inspect_token` | Deep-dive on a specific token |
| `save_preset` | Save a named filter preset |
| `list_presets` | List saved presets |
| `create_task` | Create a scheduled scan task with alerts |
| `list_tasks` | List all scan tasks |
| `run_task_scan` | Run a task scan manually |
| `run_due_tasks` | Run all due scheduled tasks |
| `test_task_alert` | Test alert delivery |
| `list_task_runs` | View task run history |
| `export_state_bundle` | Export all config as JSON |
| `import_state_bundle` | Import a config bundle |
| `get_rate_budget_stats` | Check API rate limits and usage |
| `get_cli_quickstart` | Return exact copy-paste CLI commands for Windows/macOS/Linux and live/MCP goals |

Plus 4 resources (`pyagentt://profiles`, `pyagentt://presets`, `pyagentt://tasks`, `pyagentt://cli-guide`) and 3 prompts (`alpha_scan_plan`, `runner_triage`, `cli_quickstart_guide`).

</details>

---

## AI Skill File

For AI coding agents that use skill files (Claude Code, Codex, OpenClaw), load `SKILL.md` from this repo. It teaches the agent when to activate, how to map natural language to tool calls, chain identification, filter selection, score explanation, and error handling.

---

<details>
<summary><strong>APIs & Data Sources</strong></summary>

## APIs & Data Sources

Everything works out of the box with zero API keys. You can optionally add keys to unlock more data.

### What's included for free (no keys needed)

| API | What it provides | Rate Limit |
|-----|-----------------|------------|
| [PyAgentT](https://docs.dexscreener.com/) | All token/pair data, prices, volume, liquidity, boosts, profiles | 60-300 rpm |
| [GeckoTerminal](https://www.geckoterminal.com/) | Holder counts, trending pools, new token discovery | Free tier |
| [Blockscout](https://docs.blockscout.com/) | Holder counts for Ethereum and Base | Unlimited |
| [Honeypot.is](https://honeypot.is/) | Holder counts for all EVM chains | Free tier |

### Optional APIs you can add

| API | What it unlocks | How to get a key | Cost |
|-----|----------------|-----------------|------|
| [Moralis](https://moralis.io/) | Better holder data for all chains (EVM + Solana) | Sign up at moralis.io | Free tier available (40K requests/month) |

To add an optional key, create a `.env` file in the project root:
```
MORALIS_API_KEY=your_key_here
```

### Holder data coverage per chain

The scanner tries multiple providers in order until it gets a result:

| Chain | GeckoTerminal | Moralis (optional) | Blockscout | Honeypot.is |
|-------|:---:|:---:|:---:|:---:|
| **Solana** | yes | yes (with key) | - | - |
| **Ethereum** | yes | yes (with key) | yes | yes |
| **Base** | yes | yes (with key) | yes | yes |
| **BSC** | yes | yes (with key) | - | yes |
| **Arbitrum** | yes | yes (with key) | - | yes |
| **Polygon** | yes | yes (with key) | - | yes |
| **Optimism** | yes | yes (with key) | - | yes |
| **Avalanche** | yes | yes (with key) | - | yes |

Without any API keys, you still get holder counts on every chain through GeckoTerminal, Blockscout, and Honeypot.is. Adding a Moralis key gives you a more reliable fallback.

### How rate limiting works

PyAgentT enforces:
- **60 rpm** for token profiles, boosts, orders
- **300 rpm** for search, pairs, token-pairs

The scanner handles this automatically with separate rate-limit buckets, 10-second caching, and retry/backoff. Holder data is cached for 15 minutes. You don't need to worry about hitting limits.

</details>

<details>
<summary><strong>Scan Profiles</strong></summary>

## Scan Profiles

Three built-in filter profiles, applied with chain-specific multipliers:

| Profile | Min Liquidity | Min 24h Volume | Min Txns/h | Good for |
|---------|--------------|----------------|------------|----------|
| **discovery** | $8,000 | $10,000 | 5 | Finding early gems, degen plays, micro-caps |
| **balanced** | $20,000 | $40,000 | 25 | General scanning, mix of safety and opportunity |
| **strict** | $35,000 | $90,000 | 50 | Established tokens only, blue-chip filtering |

Use `ds profiles --chains solana,base` to see chain-adjusted values.

You can also create your own profiles with `ds preset save`.

</details>

<details>
<summary><strong>How Scoring Works</strong></summary>

## How Scoring Works

Each token gets a 0-100 score based on 8 weighted components:

| Component | What it measures |
|-----------|-----------------|
| **Volume velocity** | How fast trading volume is growing |
| **Transaction velocity** | Rate of transaction count increase |
| **Relative strength** | Performance compared to the chain average |
| **Breakout readiness** | Price compression patterns (coiling before a move) |
| **Boost velocity** | Rate of PyAgentT boost activity |
| **Momentum decay** | Whether momentum is sustaining or fading |
| **Liquidity depth** | Health and depth of the liquidity pool |
| **Flow pressure** | Buy vs sell transaction imbalance |

**What the scores mean:** 80+ = very hot, 60-80 = interesting, 40-60 = moderate, below 40 = weak

</details>

<details>
<summary><strong>Extend & Customize</strong></summary>

## Extend & Customize

### Combine with free tools

| Use Case | Tools | Free? |
|----------|-------|-------|
| Safety check before buying | [RugCheck.xyz](https://rugcheck.xyz/), [GoPlus](https://gopluslabs.io/), [Token Sniffer](https://tokensniffer.com/) | Yes |
| Whale watching | [Arkham](https://www.arkhamintelligence.com/), [DeBank](https://debank.com/) | Freemium |
| Execute trades | [Jupiter](https://jup.ag/) (Solana), [1inch](https://1inch.io/) (EVM), [Paraswap](https://www.paraswap.io/) | Yes |
| Chart analysis | [TradingView](https://www.tradingview.com/) | Yes |
| Social sentiment | [LunarCrush](https://lunarcrush.com/), Twitter/X search | Freemium |
| Portfolio tracking | [Zapper](https://zapper.xyz/), [DeBank](https://debank.com/) | Yes |
| Deeper analytics | [Defined.fi](https://www.defined.fi/), [DexTools](https://www.dextools.io/) | Freemium |

### Per-chain block explorers

| Chain | Explorer |
|-------|---------|
| Solana | [Solscan](https://solscan.io/), [Solana FM](https://solana.fm/) |
| Base | [BaseScan](https://basescan.org/) |
| Ethereum | [Etherscan](https://etherscan.io/) |
| BSC | [BscScan](https://bscscan.com/) |
| Arbitrum | [Arbiscan](https://arbiscan.io/) |

### Build your own workflow

**Scan, check, trade:**
```bash
# 1. Find hot tokens
ds hot --chains solana --json > tokens.json

# 2. Check safety on RugCheck.xyz or GoPlus
# 3. Trade via Jupiter (jup.ag) or 1inch
```

**Pipe to your bot or dashboard:**
```bash
# JSON output for scripts
ds hot --chains solana --limit 5 --json | your-script.py

# Webhook alerts to a custom bot
ds task create my-bot --chains solana --interval-seconds 60
ds task configure my-bot --webhook-url https://your-server.com/hook
```

**No-code automations:**
- Use the webhook URL with [n8n](https://n8n.io/) or [Zapier](https://zapier.com/) to pipe alerts into spreadsheets, databases, or messaging apps.

</details>

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MORALIS_API_KEY` | No | Enables Moralis holder data (free tier: 40K req/month) |
| `DS_CACHE_TTL_SECONDS` | No | Override the default Dex cache TTL (default: `10`) |
| `DS_TABLE_MODE` | No | Set to `compact` for narrow terminals |
| `DS_TABLE_WIDTH` | No | Override auto-detected terminal width |

For disclosure and reporting guidance, see [SECURITY.md](SECURITY.md).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No tokens found | Lower filters: `--min-liquidity-usd 10000 --min-txns-h1 5` |
| Only Solana results | Expected when Solana dominates PyAgentT boosts. Try `--chains base` |
| Unicode garbled | Run `chcp 65001` (Windows) or use a modern terminal |
| `Option '--profile' requires an argument` | You pressed Enter too early. Run `--profile=discovery` on the same line |
| `ds` is not recognized | Make sure you're in the project folder, or use the full path `.\.venv\Scripts\ds.exe` |
| Import errors | Run `ds doctor` then `ds update` |
| API timeouts | Check internet, run `ds doctor` to verify API connectivity |

Run `ds doctor` anytime to check your setup.

---

## Updating

```bash
ds update
```

Or manually:
```bash
git pull
pip install -e .
```

---

## Project Structure

```
pyagentt_cli/
  cli.py          - All CLI commands (Typer)
  web_api.py      - FastAPI web server for local dashboard
  web_runtime.py  - Shared scanner runtime, state, and cache-backed services
  web_config.py   - Persistent web settings (cache/defaults)
  ui.py           - Terminal rendering (Rich)
  scanner.py      - Token discovery and scanning
  scoring.py      - 8-component scoring engine
  models.py       - Data models (PairSnapshot, HotTokenCandidate)
  holders.py      - Multi-provider holder count fetching
  client.py       - PyAgentT API client with rate limiting
  config.py       - Constants and filter defaults
  state.py        - Preset/task persistence (JSON files)
  mcp_server.py   - MCP server exposing all tools
  alerts.py       - Discord/Telegram/webhook alerts
  task_runner.py   - Task execution and scheduling
  watch_controls.py - Keyboard controls for live mode
web/
  index.html      - Local dashboard UI
  assets/app.jsx  - React frontend behavior and API integration
  assets/styles.css - Visual styling
pyagentt.bat      - Windows wrapper for CLI command
pyagentt-mcp.bat  - Windows wrapper for MCP server
pyagentt-web.bat  - Windows wrapper for local web dashboard
pyagentt          - Mac/Linux wrapper for CLI command
pyagentt-mcp      - Mac/Linux wrapper for MCP server
pyagentt-web      - Mac/Linux wrapper for local web dashboard
```

---

## License

MIT
