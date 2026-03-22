import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth.js";
import { healthRoutes, healthMultiRoutes } from "./routes/health.js";
import {
  statsLegacyRoutes,
  statsMultiRoutes,
} from "./routes/stats.js";
import {
  eventsLegacyRoutes,
  eventsMultiRoutes,
} from "./routes/events.js";
import {
  policyLegacyRoutes,
  policyMultiRoutes,
} from "./routes/policy.js";
import {
  usersLegacyRoutes,
  usersMultiRoutes,
} from "./routes/users.js";
import { isMultiRelayMode } from "./config/relay-instances.js";

const DEFAULT_ORIGINS = [
  "https://relay-panel.bitmacro.io",
  "http://localhost:3000",
];
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [...DEFAULT_ORIGINS, ...EXTRA_ORIGINS];

const app = new Hono();

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  console.log(`[relay-agent] ${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - start}ms`);
});
app.use("*", cors({ origin: ALLOWED_ORIGINS }));

// Auth: skip /health and /:relayId/health; require Bearer for rest
app.use("*", authMiddleware);

// Health first (both modes)
app.route("/", healthRoutes);
if (isMultiRelayMode()) {
  app.route("/", healthMultiRoutes);
  app.route("/", statsMultiRoutes);
  app.route("/", eventsMultiRoutes);
  app.route("/", policyMultiRoutes);
  app.route("/", usersMultiRoutes);
} else {
  app.route("/", statsLegacyRoutes);
  app.route("/", eventsLegacyRoutes);
  app.route("/", policyLegacyRoutes);
  app.route("/", usersLegacyRoutes);
}

export function createServer(port: number) {
  return serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  });
}

export { app };
