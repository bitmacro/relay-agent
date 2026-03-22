/**
 * EACCES fix: avoid /bin/sh entirely.
 *
 * spawn("/bin/sh", ["-c", cmd]) fails with EACCES when the parent was started
 * via nohup/PM2/systemd — even with stdio: ['ignore', 'pipe', 'pipe'].
 * The kernel denies execve("/bin/sh") in detached processes.
 *
 * Fix: spawn the target binary directly with args. No shell invocation.
 */
import { spawn } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";
import type { NostrFilter, NostrEvent, RelayStats } from "./types.js";

const SPAWN_TIMEOUT_MS = 30_000;

function spawnAsync(
  bin: string,
  args: string[],
  opts: { maxBuffer?: number; cwd?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: opts.cwd,
    });
    let stdout = "";
    let stderr = "";
    const maxBuffer = opts.maxBuffer ?? 10 * 1024 * 1024;
    let settled = false;
    const cmd = `${bin} ${args.join(" ")}`;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() =>
        reject(
          Object.assign(new Error(`Command timed out after ${SPAWN_TIMEOUT_MS}ms: ${cmd}`), {
            stdout,
            stderr,
            cmd,
            code: null,
          })
        )
      );
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on("data", (d) => {
      stdout += d;
      if (Buffer.byteLength(stdout, "utf8") > maxBuffer) {
        child.kill("SIGKILL");
        finish(() =>
          reject(
            Object.assign(new Error(`stdout exceeded maxBuffer (${maxBuffer} bytes)`), {
              stdout,
              stderr,
              cmd,
              code: null,
            })
          )
        );
      }
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (code) => {
      finish(() => {
        if (code === 0) resolve({ stdout, stderr });
        else
          reject(
            Object.assign(new Error(`Command failed: ${cmd}\n${stderr}`), {
              stdout,
              stderr,
              code,
              cmd,
            })
          );
      });
    });
    child.on("error", (err) => {
      finish(() =>
        reject(
          Object.assign(err, {
            stdout,
            stderr,
            cmd,
          })
        )
      );
    });
  });
}

const STRFRY_BIN = process.env.STRFRY_BIN ?? "strfry";
const DEFAULT_STRFRY_CONFIG = process.env.STRFRY_CONFIG;
const DEFAULT_WHITELIST_PATH = process.env.WHITELIST_PATH ?? "/etc/strfry/whitelist.txt";

/** Per-relay strfry config. When null, uses env vars (v0.1.x backward compat). */
export interface StrfryConfig {
  strfryConfig: string;
  strfryDb: string;
  whitelistPath?: string;
}

function resolveConfig(cfg: StrfryConfig | null): {
  strfryConfig: string | undefined;
  strfryDb: string;
  whitelistPath: string;
} {
  if (cfg) {
    return {
      strfryConfig: cfg.strfryConfig || undefined,
      strfryDb: cfg.strfryDb,
      whitelistPath: cfg.whitelistPath ?? DEFAULT_WHITELIST_PATH,
    };
  }
  return {
    strfryConfig: DEFAULT_STRFRY_CONFIG,
    strfryDb: process.env.STRFRY_DB_PATH ?? "./strfry-db",
    whitelistPath: DEFAULT_WHITELIST_PATH,
  };
}

function logStrfryError(operation: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const extra = err && typeof err === "object" ? err as Record<string, unknown> : {};
  const stderr = typeof extra.stderr === "string" ? extra.stderr : "";
  const cmd = typeof extra.cmd === "string" ? extra.cmd : "";
  const code = extra.code != null ? String(extra.code) : "";
  const parts = [`[strfry adapter] ${operation} failed:`, msg];
  if (cmd) parts.push(`Command: ${cmd}`);
  if (code) parts.push(`Exit code: ${code}`);
  if (stderr) parts.push(`stderr: ${stderr}`);
  console.error(parts.join("\n"));
}

function strfryArgs(cfg: { strfryConfig?: string; strfryDb: string }, subcommand: string, ...args: string[]): string[] {
  const base = cfg.strfryConfig ? ["--config", cfg.strfryConfig, subcommand] : [subcommand];
  return [...base, ...args];
}

function getStrfryCwd(dbPath: string): string | undefined {
  if (!dbPath) return undefined;
  const parent = dirname(dbPath);
  return parent !== "." ? parent : undefined;
}

function buildFilterJson(filter: NostrFilter): string {
  const obj: Record<string, unknown> = {};
  if (filter.ids?.length) obj.ids = filter.ids;
  if (filter.authors?.length) obj.authors = filter.authors;
  if (filter.kinds?.length) obj.kinds = filter.kinds;
  if (filter.since != null) obj.since = filter.since;
  if (filter.until != null) obj.until = filter.until;
  if (filter.limit != null) obj.limit = filter.limit;
  return JSON.stringify(obj);
}

export async function scanEvents(filter: NostrFilter, cfg: StrfryConfig | null = null): Promise<NostrEvent[]> {
  const resolved = resolveConfig(cfg);
  try {
    const filterJson = buildFilterJson(filter);
    const cwd = getStrfryCwd(resolved.strfryDb);
    const { stdout } = await spawnAsync(STRFRY_BIN, strfryArgs(resolved, "scan", filterJson), {
      maxBuffer: 50 * 1024 * 1024,
      cwd: cwd || undefined,
    });
    const events: NostrEvent[] = [];
    for (const line of stdout.trim().split("\n")) {
      if (!line) continue;
      try {
        const event = JSON.parse(line) as NostrEvent;
        events.push(event);
      } catch {
        // skip malformed lines
      }
    }
    return events;
  } catch (err) {
    logStrfryError("scanEvents", err);
    throw err;
  }
}

export async function deleteEvent(id: string, cfg: StrfryConfig | null = null): Promise<void> {
  const resolved = resolveConfig(cfg);
  try {
    const filterJson = JSON.stringify({ ids: [id] });
    const cwd = getStrfryCwd(resolved.strfryDb);
    await spawnAsync(STRFRY_BIN, strfryArgs(resolved, "delete", "--filter", filterJson), {
      cwd: cwd || undefined,
    });
  } catch (err) {
    logStrfryError("deleteEvent", err);
    throw err;
  }
}

export async function deleteByPubkey(pubkey: string, cfg: StrfryConfig | null = null): Promise<void> {
  const resolved = resolveConfig(cfg);
  try {
    const filterJson = JSON.stringify({ authors: [pubkey] });
    const cwd = getStrfryCwd(resolved.strfryDb);
    await spawnAsync(STRFRY_BIN, strfryArgs(resolved, "delete", "--filter", filterJson), {
      cwd: cwd || undefined,
    });
  } catch (err) {
    logStrfryError("deleteByPubkey", err);
    throw err;
  }
}

const SCAN_COUNT_TIMEOUT_MS = 60_000;

function spawnScanCount(resolved: { strfryConfig?: string; strfryDb: string }): Promise<number> {
  const cwd = getStrfryCwd(resolved.strfryDb);
  return new Promise((resolve) => {
    const child = spawn(STRFRY_BIN, strfryArgs(resolved, "scan", "{}"), {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: cwd || undefined,
    });
    let count = 0;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(count);
    }, SCAN_COUNT_TIMEOUT_MS);
    child.stdout?.on("data", (d: Buffer) => {
      for (let i = 0; i < d.length; i++) if (d[i] === 10) count++;
    });
    child.stderr?.on("data", () => {});
    child.on("close", () => {
      clearTimeout(timeout);
      resolve(count);
    });
    child.on("error", () => {
      clearTimeout(timeout);
      resolve(0);
    });
  });
}

export async function getStats(cfg: StrfryConfig | null = null): Promise<RelayStats> {
  const resolved = resolveConfig(cfg);
  let total_events = 0;
  let strfry_version = "unknown";

  const cwd = getStrfryCwd(resolved.strfryDb);
  total_events = await spawnScanCount(resolved);

  try {
    const { stdout } = await spawnAsync(STRFRY_BIN, ["--version"], {
      cwd: cwd || undefined,
    });
    const match = stdout.match(/strfry\s+([\d.]+)/i);
    strfry_version = match?.[1] ?? "unknown";
  } catch {
    // ignore
  }

  let db_size = "0";
  try {
    const { stdout } = await spawnAsync("du", ["-sh", resolved.strfryDb]);
    db_size = stdout.trim().split(/\s+/)[0] ?? "0";
  } catch {
    db_size = "unknown";
  }

  let uptime_seconds = 0;
  try {
    const { stdout: pidOut } = await spawnAsync("pgrep", ["-x", "strfry"]);
    const pid = pidOut.trim().split("\n")[0];
    if (pid) {
      const { stdout } = await spawnAsync("ps", ["-o", "etimes=", "-p", pid]);
      uptime_seconds = parseInt(stdout.trim(), 10) || 0;
    }
  } catch {
    // ignore - platform may not support ps/pgrep
  }

  return {
    total_events,
    db_size,
    uptime_seconds,
    strfry_version,
  };
}

export async function listUsers(limit = 1000, cfg: StrfryConfig | null = null): Promise<string[]> {
  const filter: NostrFilter = { kinds: [0, 1, 3], limit };
  const events = await scanEvents(filter, cfg);
  const pubkeys = new Set<string>();
  for (const e of events) {
    pubkeys.add(e.pubkey);
  }
  return Array.from(pubkeys);
}

async function readWhitelist(whitelistPath: string): Promise<string[]> {
  if (!existsSync(whitelistPath)) {
    return [];
  }
  const content = await readFile(whitelistPath, "utf-8");
  return content.split("\n").map((l) => l.trim()).filter(Boolean);
}

const PUBKEY_HEX_REGEX = /^[0-9a-f]{64}$/;

export type PolicyEntry = { pubkey: string; status: "allowed" | "blocked" };

function isValidPubkey(s: string): boolean {
  return PUBKEY_HEX_REGEX.test(s.toLowerCase());
}

export async function getPolicyEntries(cfg: StrfryConfig | null = null): Promise<PolicyEntry[]> {
  const resolved = resolveConfig(cfg);
  const lines = await readWhitelist(resolved.whitelistPath);
  const entries: PolicyEntry[] = [];
  for (const line of lines) {
    if (line.startsWith("#") || !line) continue;
    if (line.startsWith("!")) {
      const pubkey = line.slice(1).toLowerCase();
      if (isValidPubkey(pubkey)) entries.push({ pubkey, status: "blocked" });
      continue;
    }
    const pubkey = line.toLowerCase();
    if (isValidPubkey(pubkey)) entries.push({ pubkey, status: "allowed" });
  }
  return entries;
}

async function writeWhitelist(whitelistPath: string, lines: string[]): Promise<void> {
  const dir = dirname(whitelistPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(whitelistPath, lines.join("\n") + "\n", "utf-8");
}

export async function blockPubkey(pubkey: string, cfg: StrfryConfig | null = null): Promise<void> {
  const resolved = resolveConfig(cfg);
  const lines = await readWhitelist(resolved.whitelistPath);
  const blockLine = `!${pubkey}`;
  const withoutPubkey = lines.filter(
    (l) => l !== pubkey && l !== blockLine
  );
  if (!withoutPubkey.includes(blockLine)) {
    withoutPubkey.push(blockLine);
  }
  await writeWhitelist(resolved.whitelistPath, withoutPubkey);
  await deleteByPubkey(pubkey, cfg);
}

export async function allowPubkey(pubkey: string, cfg: StrfryConfig | null = null): Promise<void> {
  const resolved = resolveConfig(cfg);
  const lines = await readWhitelist(resolved.whitelistPath);
  const blockLine = `!${pubkey}`;
  const filtered = lines.filter((l) => l !== blockLine);
  if (!filtered.includes(pubkey)) {
    filtered.push(pubkey);
  }
  await writeWhitelist(resolved.whitelistPath, filtered);
}
