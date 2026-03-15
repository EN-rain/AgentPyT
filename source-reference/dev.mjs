/**
 * dev.mjs — Concurrent launcher for AgentPyT
 * 
 * Starts both the Python backend (FastAPI/uvicorn) and serves the frontend
 * from a single `npm run dev` command. It streams logs from both processes
 * with colored prefixes so you can tell them apart at a glance.
 *
 * Backend:  uvicorn with --reload on port 8765
 * Frontend: served by uvicorn at the same port (static files)
 *
 * Press Ctrl+C to stop everything.
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Colors ────────────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const CYAN   = "\x1b[36m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

// ─── Helpers ───────────────────────────────────────────────────────────────
function log(prefix, color, msg) {
  const timestamp = new Date().toLocaleTimeString();
  const lines = msg.toString().split("\n").filter(l => l.trim());
  for (const line of lines) {
    console.log(`${DIM}${timestamp}${RESET} ${color}${BOLD}[${prefix}]${RESET} ${line}`);
  }
}

function findPython() {
  // Try venv first
  const venvPython = resolve(__dirname, ".venv", "Scripts", "python.exe");
  if (existsSync(venvPython)) return venvPython;

  // Fallback: Unix-style venv
  const venvPythonUnix = resolve(__dirname, ".venv", "bin", "python");
  if (existsSync(venvPythonUnix)) return venvPythonUnix;

  // Last resort: system python
  return "python";
}

// ─── Banner ────────────────────────────────────────────────────────────────
console.log(`
${CYAN}${BOLD}  ╔══════════════════════════════════════════╗
  ║     🚀  AgentPyT Dev Server  🚀          ║
  ╚══════════════════════════════════════════╝${RESET}
`);

// ─── Spawn Backend (FastAPI + uvicorn with reload) ─────────────────────────
const python = findPython();
log("INIT", YELLOW, `Using Python: ${python}`);

const backend = spawn(
  python,
  [
    "-m", "uvicorn",
    "pyagentt_cli.web_api:app",
    "--host", "127.0.0.1",
    "--port", "8765",
    "--reload",
    "--reload-dir", "pyagentt_cli",
    "--reload-dir", "web",
  ],
  {
    cwd: __dirname,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  }
);

backend.stdout.on("data", (data) => log("BACKEND", GREEN, data));
backend.stderr.on("data", (data) => log("BACKEND", GREEN, data));
backend.on("close", (code) => {
  log("BACKEND", code === 0 ? GREEN : RED, `Exited with code ${code}`);
  process.exit(code ?? 1);
});

backend.on("error", (err) => {
  log("BACKEND", RED, `Failed to start: ${err.message}`);
  log("BACKEND", RED, "Make sure you ran install.bat first to set up the Python venv.");
  process.exit(1);
});

// ─── Ready message ─────────────────────────────────────────────────────────
setTimeout(() => {
  console.log(`
${GREEN}${BOLD}  ✓ Backend${RESET}   → ${CYAN}http://127.0.0.1:8765${RESET}  ${DIM}(FastAPI + React UI)${RESET}
${DIM}  Press Ctrl+C to stop${RESET}
`);
}, 2000);

// ─── Graceful shutdown ─────────────────────────────────────────────────────
function cleanup() {
  console.log(`\n${YELLOW}${BOLD}  Shutting down...${RESET}`);
  
  if (backend && !backend.killed) {
    backend.kill("SIGTERM");
    // Force kill after 3 seconds if still running
    setTimeout(() => {
      if (!backend.killed) {
        backend.kill("SIGKILL");
      }
    }, 3000);
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
