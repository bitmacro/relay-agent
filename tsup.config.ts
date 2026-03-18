import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/relay-agent": "bin/relay-agent.ts",
  },
  format: ["esm"],
  target: "node18",
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ["hono", "@hono/node-server"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});