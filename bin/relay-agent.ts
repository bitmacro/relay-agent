import { parseArgs } from "util";
import { createServer } from "../src/index.js";

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "7800" },
    token: { type: "string", short: "t" },
  },
  allowPositionals: true,
});

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
