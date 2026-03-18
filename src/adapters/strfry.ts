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
const WHITELIST_PATH = process.env.WHITELIST_PATH ?? "/etc/strfry/whitelist.txt";

function getStrfryDbPath(): string {
  return process.env.STRFRY_DB_PATH ?? "./strfry-db";
}

function getStrfryCwd(): string | undefined {
  const dbPath = getStrfryDbPath();
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

export async function scanEvents(filter: NostrFilter): Promise<NostrEvent[]> {
  try {
    const filterJson = buildFilterJson(filter);
    const cwd = getStrfryCwd();
    const { stdout } = await spawnAsync(STRFRY_BIN, ["scan", filterJson], {
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
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = err && typeof err === "object" && "stderr" in err ? String((err as { stderr?: string }).stderr) : "";
    console.error("[strfry adapter] scanEvents error:", msg, stderr ? `\nstderr: ${stderr}` : "");
    throw err;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const filterJson = JSON.stringify({ ids: [id] });
  const cwd = getStrfryCwd();
  await spawnAsync(STRFRY_BIN, ["delete", "--filter", filterJson], {
    cwd: cwd || undefined,
  });
}

export async function deleteByPubkey(pubkey: string): Promise<void> {
  const filterJson = JSON.stringify({ authors: [pubkey] });
  const cwd = getStrfryCwd();
  await spawnAsync(STRFRY_BIN, ["delete", "--filter", filterJson], {
    cwd: cwd || undefined,
  });
}

export async function getStats(): Promise<RelayStats> {
  let total_events = 0;
  let strfry_version = "unknown";

  const cwd = getStrfryCwd();
  try {
    const { stdout } = await spawnAsync(STRFRY_BIN, ["scan", "{}"], {
      cwd: cwd || undefined,
      maxBuffer: 50 * 1024 * 1024,
    });
    total_events = stdout.trim().split("\n").filter(Boolean).length;
  } catch {
    total_events = 0;
  }

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
    const { stdout } = await spawnAsync("du", ["-sh", getStrfryDbPath()]);
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

export async function listUsers(limit = 1000): Promise<string[]> {
  const filter: NostrFilter = { kinds: [0, 1, 3], limit };
  const events = await scanEvents(filter);
  const pubkeys = new Set<string>();
  for (const e of events) {
    pubkeys.add(e.pubkey);
  }
  return Array.from(pubkeys);
}

async function readWhitelist(): Promise<string[]> {
  if (!existsSync(WHITELIST_PATH)) {
    return [];
  }
  const content = await readFile(WHITELIST_PATH, "utf-8");
  return content.split("\n").map((l) => l.trim()).filter(Boolean);
}

async function writeWhitelist(lines: string[]): Promise<void> {
  const dir = dirname(WHITELIST_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(WHITELIST_PATH, lines.join("\n") + "\n", "utf-8");
}

export async function blockPubkey(pubkey: string): Promise<void> {
  const lines = await readWhitelist();
  const blockLine = `!${pubkey}`;
  const withoutPubkey = lines.filter(
    (l) => l !== pubkey && l !== blockLine
  );
  if (!withoutPubkey.includes(blockLine)) {
    withoutPubkey.push(blockLine);
  }
  await writeWhitelist(withoutPubkey);
  await deleteByPubkey(pubkey);
}

export async function allowPubkey(pubkey: string): Promise<void> {
  const lines = await readWhitelist();
  const blockLine = `!${pubkey}`;
  const filtered = lines.filter((l) => l !== blockLine);
  if (!filtered.includes(pubkey)) {
    filtered.push(pubkey);
  }
  await writeWhitelist(filtered);
}
