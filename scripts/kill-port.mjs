/**
 * Free a TCP port before starting the server.
 *
 * Why: `next start` / `next dev` fail with EADDRINUSE when a previous Node
 * process wasn't fully stopped (terminal closed, Ctrl+C didn't reap the
 * child, etc.). This runs as a `pre` hook so the port is always free.
 *
 * Usage: node scripts/kill-port.mjs [port]   (default 3000)
 *
 * Safe to run when nothing is listening — it just exits 0.
 * Cross-platform: uses lsof on macOS/Linux, netstat on Windows.
 */
import { execSync } from 'node:child_process';

const port = Number(process.argv[2] || process.env.PORT || 3000);

function findPidsUnix(p) {
  try {
    // -t = terse (PIDs only). May list multiple PIDs.
    const out = execSync(`lsof -nP -iTCP:${p} -sTCP:LISTEN -t`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return out ? out.split(/\s+/).filter(Boolean) : [];
  } catch {
    return []; // lsof exits non-zero when nothing matches
  }
}

function findPidsWindows(p) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${p}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      const pid = cols[cols.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

const isWindows = process.platform === 'win32';
const pids = isWindows ? findPidsWindows(port) : findPidsUnix(port);

if (pids.length === 0) {
  console.log(`[kill-port] Port ${port} is free.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    if (isWindows) execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    console.log(`[kill-port] Killed process ${pid} on port ${port}.`);
  } catch (e) {
    console.warn(`[kill-port] Could not kill ${pid}: ${e instanceof Error ? e.message : e}`);
  }
}
