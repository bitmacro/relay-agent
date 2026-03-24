import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PKG_NAME = "@bitmacro/relay-agent";

const CANDIDATE_PATHS = [
  "/app/package.json", // Docker
  join(process.cwd(), "package.json"),
  join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
  join(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
];

function versionFromPkgJson(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const pkg = raw as Record<string, unknown>;
  if (pkg.name !== PKG_NAME) return null;
  const v = pkg.version;
  return typeof v === "string" ? v : null;
}

export function getVersion(): string {
  const fromEnv = process.env.RELAY_AGENT_VERSION?.trim();
  if (fromEnv) return fromEnv;

  for (const p of CANDIDATE_PATHS) {
    try {
      const pkg = JSON.parse(readFileSync(p, "utf-8"));
      const v = versionFromPkgJson(pkg);
      if (v) return v;
    } catch {
      /* try next */
    }
  }
  return "0.0.0";
}
