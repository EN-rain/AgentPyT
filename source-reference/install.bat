@echo off
chcp 65001 >nul
echo.
echo  ====================================
echo   PyAgentT - Quick Install
echo  ====================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install Python 3.11+ from python.org
    pause
    exit /b 1
)

:: Create venv if missing
if not exist ".venv" (
    echo  Creating virtual environment...
    python -m venv .venv
)

:: Activate and install
echo  Installing dependencies...
call .venv\Scripts\activate.bat
pip install -e . --quiet

echo.
echo  ====================================
echo   Install complete!
echo  ====================================
echo.

:: Auto-run doctor so the user sees their status immediately
echo  Running diagnostics...
echo.
.venv\Scripts\pyagentt.exe doctor

echo.
echo  ====================================
echo   What to do next
echo  ====================================
echo.
echo  You can run commands directly without activating anything:
echo.
echo    pyagentt setup        - Pick your chains and preferences (recommended first!)
echo    pyagentt hot          - Scan hot tokens right now
echo    pyagentt watch        - Live auto-refreshing dashboard
echo    pyagentt quickstart   - Print copy-paste commands for your shell
echo    pyagentt --help       - See all commands
echo.
echo  Or for the best live experience, paste this:
echo.
echo    pyagentt new-runners-watch --chain=solana --watch-chains=solana,base --profile=discovery --max-age-hours=48 --include-unknown-age --interval=2
echo.
echo  React web dashboard:
echo.
echo    pyagentt-web
echo.
pause
