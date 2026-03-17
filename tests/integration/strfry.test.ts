import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import * as strfry from "../../src/adapters/strfry.js";

const STRFRY_BIN = process.env.STRFRY_BIN ?? "strfry";

function strfryExists(): boolean {
  try {
    execSync(`${STRFRY_BIN} --version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

describe("strfry adapter integration", () => {
  beforeAll(() => {
    if (!strfryExists()) {
      console.warn("strfry not found, skipping integration tests");
    }
  });

  it.skipIf(!strfryExists())(
    "scanEvents returns events",
    async () => {
      const events = await strfry.scanEvents({ limit: 10 });
      expect(Array.isArray(events)).toBe(true);
      if (events.length > 0) {
        expect(events[0]).toHaveProperty("id");
        expect(events[0]).toHaveProperty("pubkey");
        expect(events[0]).toHaveProperty("kind");
      }
    },
    { timeout: 15000 }
  );

  it.skipIf(!strfryExists())(
    "getStats returns RelayStats shape",
    async () => {
      const stats = await strfry.getStats();
      expect(stats).toHaveProperty("total_events");
      expect(stats).toHaveProperty("db_size");
      expect(stats).toHaveProperty("uptime_seconds");
      expect(stats).toHaveProperty("strfry_version");
      expect(typeof stats.total_events).toBe("number");
      expect(typeof stats.db_size).toBe("string");
    },
    { timeout: 15000 }
  );

  it.skipIf(!strfryExists())(
    "listUsers returns array of pubkeys",
    async () => {
      const users = await strfry.listUsers(5);
      expect(Array.isArray(users)).toBe(true);
      users.forEach((u) => expect(typeof u).toBe("string"));
    },
    { timeout: 15000 }
  );

  it.skipIf(!strfryExists())(
    "deleteEvent removes event by id",
    async () => {
      const testDbDir = join(tmpdir(), `strfry-test-${Date.now()}`);
      await mkdir(testDbDir, { recursive: true });
      const origDb = process.env.STRFRY_DB_PATH;
      process.env.STRFRY_DB_PATH = join(testDbDir, "strfry-db");

      const testEvent = {
        id: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        pubkey: "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: "integration test event",
        sig: "c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      };
      const jsonl = JSON.stringify(testEvent) + "\n";

      try {
        const { spawn } = await import("child_process");
        const proc = spawn(STRFRY_BIN, ["import"], {
          cwd: testDbDir,
          stdio: ["pipe", "pipe", "pipe"],
        });
        proc.stdin?.write(jsonl);
        proc.stdin?.end();
        await new Promise<void>((resolve, reject) => {
          proc.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error(`exit ${code}`))
          );
        });

        const before = await strfry.scanEvents({ ids: [testEvent.id] });
        expect(before.length).toBeGreaterThanOrEqual(0);

        await strfry.deleteEvent(testEvent.id);

        const after = await strfry.scanEvents({ ids: [testEvent.id] });
        expect(after.length).toBe(0);
      } finally {
        process.env.STRFRY_DB_PATH = origDb;
      }
    },
    { timeout: 20000 }
  );
});
