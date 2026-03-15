#!/usr/bin/env bash
set -e

echo ""
echo "  ===================================="
echo "   AgentPyT - Quick Install"
echo "  ===================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "  [ERROR] Python 3 not found. Install Python 3.11+ first."
    exit 1
fi

# Create venv if missing
if [ ! -d ".venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate and install
echo "  Installing dependencies..."
source .venv/bin/activate
pip install -e . --quiet

# Make wrapper scripts executable
chmod +x pyagentt pyagentt-mcp pyagentt-web 2>/dev/null || true

echo ""
echo "  ===================================="
echo "   Install complete!"
echo "  ===================================="
echo ""

# Auto-run doctor so the user sees their status immediately
echo "  Running diagnostics..."
echo ""
.venv/bin/pyagentt doctor

echo ""
echo "  ===================================="
echo "   What to do next"
echo "  ===================================="
echo ""
echo "  You can run commands directly without activating anything:"
echo ""
echo "    ./pyagentt setup        - Pick your chains and preferences (recommended first!)"
echo "    ./pyagentt hot          - Scan hot tokens right now"
echo "    ./pyagentt watch        - Live auto-refreshing dashboard"
echo "    ./pyagentt quickstart   - Print copy-paste commands for your shell"
echo "    ./pyagentt --help       - See all commands"
echo ""
echo "  Or for the best live experience, paste this:"
echo ""
echo "    ./pyagentt new-runners-watch --chain=solana --watch-chains=solana,base --profile=discovery --max-age-hours=48 --include-unknown-age --interval=2"
echo ""
echo "  MCP server (for AI agents):"
echo "    ./pyagentt-mcp"
echo ""
echo "  React web dashboard:"
echo "    ./pyagentt-web"
echo ""
