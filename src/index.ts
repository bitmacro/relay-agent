import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { eventsRoutes } from "./routes/events.js";
import { statsRoutes } from "./routes/stats.js";
import { policyRoutes } from "./routes/policy.js";
import { usersRoutes } from "./routes/users.js";

const app = new Hono();

// Auth middleware: skip for /health
app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next();
  return authMiddleware(c, next);
});

app.route("/", healthRoutes);
app.route("/", eventsRoutes);
app.route("/", statsRoutes);
app.route("/", policyRoutes);
app.route("/", usersRoutes);

export function createServer(port: number) {
  return serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  });
}

export { app };
