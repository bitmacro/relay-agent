import { parseArgs } from "util";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { createServer } from "../src/index.js";

process.on("uncaughtException", (err) => {
  console.error("[relay-agent] uncaughtException:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[relay-agent] unhandledRejection:", reason, promise);
});

const __dirname = dirname(process.argv[1] ?? ".");

function getVersion(): string {
  for (const rel of ["../../package.json", "../package.json"]) {
    try {
      const p = join(__dirname, rel);
      const pkg = JSON.parse(readFileSync(p, "utf-8"));
      return pkg.version ?? "0.0.0";
    } catch {
      /* try next */
    }
  }
  return "0.0.0";
}

const HELP = `Usage: relay-agent [options]

Options:
  -p, --port <port>   Port to listen on (default: 7800)
  -t, --token <token> Bearer token for API auth (or set RELAY_AGENT_TOKEN)
  -v, --version       Show version
  -h, --help          Show this help
`;

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "7800" },
    token: { type: "string", short: "t" },
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.version) {
  console.log(getVersion());
  process.exit(0);
}
if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const token =
  values.token ??
  process.env.RELAY_AGENT_TOKEN ??
  process.env.TOKEN;
if (!token) {
  console.error("Error: --token is required (or set RELAY_AGENT_TOKEN env var)");
  process.exit(1);
}

process.env.RELAY_AGENT_TOKEN = token;

const port = parseInt(values.port ?? process.env.PORT ?? "7800", 10);
createServer(port);
console.log(`relay-agent listening on http://localhost:${port}`);
