import { spawn } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";
import type { NostrFilter, NostrEvent, RelayStats } from "./types.js";

function execAsync(
  cmd: string,
  opts: { maxBuffer?: number; cwd?: string; stdio?: unknown } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/sh", ["-c", cmd], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: opts.cwd,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (code) => {
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
    child.on("error", reject);
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
    const { stdout } = await execAsync(
      `${STRFRY_BIN} scan '${filterJson.replace(/'/g, "'\\''")}'`,
      {
        maxBuffer: 50 * 1024 * 1024,
        cwd: cwd || undefined,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
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
    console.error("[strfry adapter] scanEvents error:", err);
    throw err;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const filterJson = JSON.stringify({ ids: [id] });
  const cwd = getStrfryCwd();
  await execAsync(
    `${STRFRY_BIN} delete --filter '${filterJson.replace(/'/g, "'\\''")}'`,
    { cwd: cwd || undefined, stdio: ["ignore", "pipe", "pipe"] }
  );
}

export async function deleteByPubkey(pubkey: string): Promise<void> {
  const filterJson = JSON.stringify({ authors: [pubkey] });
  const cwd = getStrfryCwd();
  await execAsync(
    `${STRFRY_BIN} delete --filter '${filterJson.replace(/'/g, "'\\''")}'`,
    { cwd: cwd || undefined, stdio: ["ignore", "pipe", "pipe"] }
  );
}

export async function getStats(): Promise<RelayStats> {
  let total_events = 0;
  let strfry_version = "unknown";

  const cwd = getStrfryCwd();
  try {
    const { stdout } = await execAsync(
      `${STRFRY_BIN} scan '{}' | wc -l`,
      { cwd: cwd || undefined, stdio: ["ignore", "pipe", "pipe"] }
    );
    total_events = parseInt(stdout.trim(), 10) || 0;
  } catch {
    total_events = 0;
  }

  try {
    const { stdout } = await execAsync(`${STRFRY_BIN} --version`, {
      cwd: cwd || undefined,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const match = stdout.match(/strfry\s+([\d.]+)/i);
    strfry_version = match?.[1] ?? "unknown";
  } catch {
    // ignore
  }

  let db_size = "0";
  try {
    const { stdout } = await execAsync(
      `du -sh ${getStrfryDbPath()} 2>/dev/null || echo "0"`,
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    db_size = stdout.trim().split(/\s+/)[0] ?? "0";
  } catch {
    db_size = "unknown";
  }

  let uptime_seconds = 0;
  try {
    const { stdout: pidOut } = await execAsync("pgrep -x strfry", {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const pid = pidOut.trim().split("\n")[0];
    if (pid) {
      const { stdout } = await execAsync(`ps -o etimes= -p ${pid}`, {
        stdio: ["ignore", "pipe", "pipe"],
      });
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
