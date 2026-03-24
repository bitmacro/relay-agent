import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const CANDIDATE_PATHS = [
  "/app/package.json", // Docker
  join(process.cwd(), "package.json"),
  join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
  join(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
];

export function getVersion(): string {
  for (const p of CANDIDATE_PATHS) {
    try {
      const pkg = JSON.parse(readFileSync(p, "utf-8"));
      return pkg.version ?? "0.0.0";
    } catch {
      /* try next */
    }
  }
  return "0.0.0";
}
