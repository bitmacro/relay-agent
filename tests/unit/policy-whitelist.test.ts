import { describe, it, expect, beforeEach } from "vitest";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import * as strfry from "../../src/adapters/strfry.js";

const PK_ALLOWED = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PK_BLOCKED = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("policy whitelist file ops (strfry adapter)", () => {
  let dir: string;
  let wlPath: string;
  let cfg: strfry.StrfryConfig;

  beforeEach(async () => {
    dir = join(tmpdir(), `relay-agent-wl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(dir, { recursive: true });
    const dbDir = join(dir, "strfrydata");
    await mkdir(dbDir, { recursive: true });
    wlPath = join(dir, "whitelist.txt");
    cfg = {
      strfryConfig: join(dir, "dummy.conf"),
      strfryDb: join(dbDir, "db"),
    };
  });

  it("removeAllowPubkey removes plain hex line and preserves block lines", async () => {
    await writeFile(wlPath, `${PK_ALLOWED}\n!${PK_BLOCKED}\n`, "utf-8");
    const ok = await strfry.removeAllowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(true);
    const text = await readFile(wlPath, "utf-8");
    expect(text).not.toContain(PK_ALLOWED);
    expect(text).toContain(`!${PK_BLOCKED}`);
  });

  it("removeAllowPubkey returns false when allow line missing", async () => {
    await writeFile(wlPath, `!${PK_ALLOWED}\n`, "utf-8");
    const ok = await strfry.removeAllowPubkey(PK_BLOCKED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(false);
  });

  it("removeAllowPubkey ignores !lines (does not strip block as allow)", async () => {
    await writeFile(wlPath, `!${PK_ALLOWED}\n`, "utf-8");
    const ok = await strfry.removeAllowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(false);
    const text = await readFile(wlPath, "utf-8");
    expect(text.trim()).toBe(`!${PK_ALLOWED}`);
  });

  it("removeBlockPubkey removes ! line case-insensitively", async () => {
    await writeFile(wlPath, `!${PK_BLOCKED.toUpperCase()}\n${PK_ALLOWED}\n`, "utf-8");
    const ok = await strfry.removeBlockPubkey(PK_BLOCKED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(true);
    const text = await readFile(wlPath, "utf-8");
    expect(text).not.toContain("!");
    expect(text).toContain(PK_ALLOWED);
  });

  it("removeBlockPubkey returns false when block line missing", async () => {
    await writeFile(wlPath, `${PK_ALLOWED}\n`, "utf-8");
    const ok = await strfry.removeBlockPubkey(PK_BLOCKED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(false);
  });

  it("listBlockedPubkeys returns valid hex pubkeys from ! lines only", async () => {
    await writeFile(
      wlPath,
      `# comment\n!${PK_BLOCKED}\n!notvalid\n${PK_ALLOWED}\n`,
      "utf-8"
    );
    const { blocked, count } = await strfry.listBlockedPubkeys({ ...cfg, whitelistPath: wlPath });
    expect(count).toBe(1);
    expect(blocked).toEqual([PK_BLOCKED]);
  });

  it("allowPubkey adds # npub comment and hex line", async () => {
    await writeFile(wlPath, "", "utf-8");
    await strfry.allowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath });
    const text = await readFile(wlPath, "utf-8");
    expect(text).toContain(PK_ALLOWED);
    expect(text).toMatch(/^# npub1/m);
  });

  it("allowPubkey adds optional label before em dash npub", async () => {
    await writeFile(wlPath, "", "utf-8");
    await strfry.allowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath }, { label: "Alice" });
    const text = await readFile(wlPath, "utf-8");
    expect(text).toContain("# Alice — npub1");
    expect(text).toContain(PK_ALLOWED);
  });

  it("removeAllowPubkey removes preceding # comment for that allow line", async () => {
    await writeFile(wlPath, "", "utf-8");
    await strfry.allowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath }, { label: "Bob" });
    const ok = await strfry.removeAllowPubkey(PK_ALLOWED, { ...cfg, whitelistPath: wlPath });
    expect(ok).toBe(true);
    const text = await readFile(wlPath, "utf-8");
    expect(text).not.toContain(PK_ALLOWED);
    expect(text).not.toContain("# Bob");
  });
});
