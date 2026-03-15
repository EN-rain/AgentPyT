# UI/UX Specification

> Design system for PyAgenT's terminal interface

## 🎨 Design Principles

1. **Fast Visual Parsing** — Information hierarchy over decoration
2. **Semantic Color Coding** — Consistent meaning across all views
3. **Anchor Pattern** — Primary table always visible
4. **Compact Summaries** — Secondary info in side/bottom panels

---

## 🌈 Color System

### Semantic Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Green** | `#4ade80` | Positive momentum, buy pressure |
| **Red** | `#f87171` | Negative momentum, sell pressure |
| **Cyan** | `#67e8f9` | Freshness, new tokens |
| **Gold** | `#fbbf24` | Token symbols, highlights |
| **Blue** | `#60a5fa` | Chain identifiers, links |
| **Purple** | `#a78bfa` | Signal tags, special indicators |

### Structural Palette

| Constant | Hex | Usage |
|----------|-----|-------|
| `C_BORDER` | `#3a3d4a` | Table and panel borders |
| `C_BORDER_DIM` | `#2a2d3a` | Subtle borders |
| `C_ROW_ALT` | `#1e2029` | Alternating row background |
| `C_TITLE` | `#e5e7eb` | Titles, headers |
| `C_LABEL` | `#6b7280` | Labels, metadata |
| `C_DIM` | `#4b5563` | Secondary text |
| `C_TEXT` | `#d1d5db` | Primary text |

---

## 📐 Layout Specifications

### Primary Views

| Command | Layout | Refresh |
|---------|--------|---------|
| `hot` | Static table | One-shot |
| `watch` | Full-screen dashboard | Auto (2-10s) |
| `inspect` | Detail + risk panels | One-shot |
| `search` | Compact table | One-shot |

### Dashboard Structure (Watch Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  PyAgenT Live                              UTC: 2026-03-15... │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ #  Chain  Token     Score  Price    1h    Vol    Liq   │   │
│  │ 1  ● SOL  TOKEN1    85.2   $0.05   +12%   1.2M   300K  │   │
│  │ 2  ● BASE TOKEN2    78.5   $0.12   +8%    890K   200K  │   │
│  │ ...                                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐   │
│  │ Chain Heat   │  │ Market Structure │  │ Risk Summary   │   │
│  │ SOL: 🔥🔥🔥  │  │ Vol/Liq: 4.2x    │  │ 2 low-liquidity│   │
│  │ BASE: 🔥🔥   │  │ Buy pressure: +  │  │ 1 concentrated │   │
│  └──────────────┘  └──────────────────┘  └────────────────┘   │
│                                                                │
│  [1/2] Switch chain  [s] Sort  [j/k] Nav  [c] Copy  [Ctrl+C] Exit│
└────────────────────────────────────────────────────────────────┘
```

### Table Column Order

| # | Column | Alignment | Width | Color |
|---|--------|-----------|-------|-------|
| 1 | Rank | Right | 3 | Gold (top 3) |
| 2 | Chain | Left | 4 | Blue dot |
| 3 | Token | Left | 12 | Gold symbol |
| 4 | Score | Right | 6 | Gradient |
| 5 | Price | Right | 10 | White |
| 6 | 1h Change | Right | 8 | Green/Red |
| 7 | 24h Volume | Right | 10 | Tiered |
| 8 | 1h Txns | Right | 6 | White |
| 9 | Liquidity | Right | 10 | White |
| 10 | Market Cap | Right | 10 | White |
| 11 | Age | Right | 8 | Cyan tiered |
| 12 | Tags | Left | 20 | Purple |

---

## 🎯 Visual Helpers

### Rank Badge
```python
def _rank_badge(i: int) -> Text:
    """Diamond-styled rank indicator"""
    if i == 1:   return Text("◆", style="bold #fbbf24")  # Gold
    if i == 2:   return Text("◆", style="bold #c0c0c0")  # Silver
    if i == 3:   return Text("◆", style="bold #cd7f32")  # Bronze
    return Text(f"{i}", style="dim")
```

### Momentum Text
```python
def _momentum_text(value: float) -> Text:
    """Arrow-prefixed percentage"""
    if value > 0:
        return Text(f"▲ {value:.1f}%", style=f"bold {C_GREEN}")
    if value < 0:
        return Text(f"▼ {value:.1f}%", style=f"bold {C_RED}")
    return Text("—", style=C_DIM)
```

### Age Badge
```python
def _age_badge(hours: float) -> Text:
    """Freshness indicator with dot for new tokens"""
    if hours < 1:
        return Text("● <1h", style=f"bold {C_CYAN}")
    if hours < 24:
        return Text(f"{int(hours)}h", style=C_CYAN)
    if hours < 72:
        return Text(f"{int(hours/24)}d", style=C_TEXT)
    return Text(f"{int(hours/24)}d", style=C_DIM)
```

### Volume Heat
```python
def _vol_heat(volume: float) -> Text:
    """Volume with intensity-based color"""
    if volume >= 1_000_000:
        return Text(f"${volume/1e6:.1f}M", style=f"bold {C_GREEN}")
    if volume >= 100_000:
        return Text(f"${volume/1e3:.0f}K", style=C_GREEN)
    return Text(f"${volume/1e3:.0f}K", style=C_TEXT)
```

### Score Gauge
```python
def _score_gauge(score: float) -> Text:
    """Visual bar with fill/empty chars"""
    filled = int(score / 10)
    bar = "█" * filled + "░" * (10 - filled)
    color = C_GREEN if score >= 70 else C_TEXT if score >= 50 else C_DIM
    return Text(f"{bar} {score:.0f}", style=color)
```

---

## 🖥️ Terminal Compatibility

### Minimum Requirements
- Width: 100 columns (compact mode at 80)
- Height: 24 rows
- Encoding: UTF-8
- Colors: 256-color support recommended

### Responsive Behavior

| Width | Mode | Changes |
|-------|------|---------|
| ≥120 | Full | All columns visible |
| 100-119 | Standard | Minor truncation |
| 80-99 | Compact | Hide some columns |
| <80 | Minimal | Essential columns only |

### Safe Unicode
```python
# Always wrap raw Unicode
def _safe_text(s: str) -> Text:
    try:
        s.encode(sys.stdout.encoding or "utf-8")
        return Text(s)
    except UnicodeEncodeError:
        return Text(s.encode("ascii", "replace").decode())
```

---

## ⌨️ Interaction Model

### Watch Mode Controls

| Key | Action |
|-----|--------|
| `1` | Switch to first chain |
| `2` | Switch to second chain |
| `s` | Cycle sort mode (score/volume/momentum) |
| `j` | Navigate down |
| `k` | Navigate up |
| `c` | Copy address to clipboard |
| `Ctrl+C` | Exit |

### Sort Modes

| Mode | Primary Key | Secondary |
|------|-------------|-----------|
| `score` | Score (desc) | Breakout readiness |
| `volume` | 1h Volume (desc) | Txns |
| `momentum` | 1h Change (desc) | Volume |
| `readiness` | Breakout readiness | Score |

---

## 🚫 Anti-Patterns

### DO NOT

1. **Hardcode colors in CLI**
   ```python
   # WRONG
   console.print("[red]Error[/red]")
   
   # CORRECT
   from .ui import C_RED
   console.print(f"[{C_RED}]Error[/{C_RED}]")
   ```

2. **Override row backgrounds**
   ```python
   # WRONG - breaks alternation
   table.add_row(..., style="on red")
   
   # CORRECT - let row_styles handle it
   table.add_row(...)
   ```

3. **Use ROUNDED borders**
   ```python
   # WRONG
   box=box.ROUNDED
   
   # CORRECT
   box=box.SIMPLE_HEAVY  # tables
   box=box.HEAVY         # panels
   ```

4. **Skip _safe_text() for Unicode**
   ```python
   # WRONG
   Text("◆")
   
   # CORRECT
   _safe_text("◆")
   ```

---

## 📝 Code Patterns

### Table Construction Template
```python
from rich.table import Table
from rich import box
from .ui import C_TEXT, C_BORDER, C_ROW_ALT

table = Table(
    title="Hot Tokens",
    box=box.SIMPLE_HEAVY,
    header_style=f"bold {C_TEXT}",
    row_styles=["", f"on {C_ROW_ALT}"],  # Alternating
    border_style=C_BORDER,
    title_style="",
)

table.add_column("#", justify="right", width=3)
table.add_column("Token", style=f"bold {C_GOLD}")
# ... more columns

for i, row in enumerate(data, 1):
    table.add_row(
        _rank_badge(i),
        Text(row.symbol, style=f"bold {C_GOLD}"),
        # ... no per-row style!
    )
```

### Panel Template
```python
from rich.panel import Panel
from rich import box
from .ui import C_BORDER

panel = Panel(
    content,
    title="[bold]Title[/bold]",
    border_style=C_BORDER,
    box=box.HEAVY,
    padding=(0, 1),
)
```

---

## ♿ Accessibility

### Color Independence
- Always include `+`/`-` symbols with colors
- Tags provide textual signals
- JSON mode preserves full precision

### Screen Reader Considerations
- Clear column headers
- Logical tab order (if interactive)
- Descriptive labels on all controls
