import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export function getVersion(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    for (const rel of ["../../package.json", "../package.json"]) {
      try {
        const p = join(dir, rel);
        const pkg = JSON.parse(readFileSync(p, "utf-8"));
        return pkg.version ?? "0.0.0";
      } catch {
        /* try next */
      }
    }
  } catch {
    /* ignore */
  }
  return "0.0.0";
}
