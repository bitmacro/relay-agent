import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";
import type { NostrFilter, NostrEvent, RelayStats } from "./types.js";

const execFileAsync = promisify(execFile);

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
  const filterJson = buildFilterJson(filter);
  const cwd = getStrfryCwd();
  const { stdout } = await execFileAsync(
    STRFRY_BIN,
    ["scan", filterJson],
    { maxBuffer: 50 * 1024 * 1024, cwd: cwd || undefined }
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
}

export async function deleteEvent(id: string): Promise<void> {
  const filterJson = JSON.stringify({ ids: [id] });
  const cwd = getStrfryCwd();
  await execFileAsync(STRFRY_BIN, ["delete", "--filter", filterJson], {
    cwd: cwd || undefined,
  });
}

export async function deleteByPubkey(pubkey: string): Promise<void> {
  const filterJson = JSON.stringify({ authors: [pubkey] });
  const cwd = getStrfryCwd();
  await execFileAsync(STRFRY_BIN, ["delete", "--filter", filterJson], {
    cwd: cwd || undefined,
  });
}

export async function getStats(): Promise<RelayStats> {
  let total_events = 0;
  let strfry_version = "unknown";

  const cwd = getStrfryCwd();
  try {
    const { stdout: countOut } = await execFileAsync(
      STRFRY_BIN,
      ["export", "--count"],
      { cwd: cwd || undefined }
    );
    total_events = parseInt(countOut.trim(), 10) || 0;
  } catch {
    // strfry export --count may not exist in all versions
    const { stdout } = await execFileAsync("sh", [
      "-c",
      `${STRFRY_BIN} scan '{}' | wc -l`,
    ], { cwd: cwd || undefined });
    total_events = parseInt(stdout.trim(), 10) || 0;
  }

  try {
    const { stdout } = await execFileAsync(STRFRY_BIN, ["--version"], {
      cwd: cwd || undefined,
    });
    const match = stdout.match(/strfry\s+([\d.]+)/i);
    strfry_version = match?.[1] ?? "unknown";
  } catch {
    // ignore
  }

  let db_size = "0";
  try {
    const { stdout } = await execFileAsync("du", ["-sh", getStrfryDbPath()]);
    db_size = stdout.trim().split(/\s+/)[0] ?? "0";
  } catch {
    // ignore
  }

  let uptime_seconds = 0;
  try {
    const { stdout: pidOut } = await execFileAsync("pgrep", ["-x", "strfry"]);
    const pid = pidOut.trim().split("\n")[0];
    if (pid) {
      const { stdout } = await execFileAsync("ps", [
        "-o",
        "etimes=",
        "-p",
        pid,
      ]);
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
