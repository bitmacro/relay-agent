import { Hono } from "hono";
import { getRelayInstances, isMultiRelayMode } from "../config/relay-instances.js";
import { getVersion } from "../lib/version.js";

export const healthRoutes = new Hono();

// GET /health — no auth; lists all relayIds when multi-relay, else simple ok
healthRoutes.get("/health", (c) => {
  const version = getVersion();
  if (isMultiRelayMode()) {
    const instances = getRelayInstances() ?? [];
    return c.json({
      status: "ok",
      version,
      timestamp: new Date().toISOString(),
      relayIds: instances.map((i) => i.id),
    });
  }
  return c.json({ status: "ok", version, timestamp: new Date().toISOString() });
});

/** v0.2.x only: GET /:relayId/health */
export const healthMultiRoutes = new Hono();
healthMultiRoutes.get("/:relayId/health", (c) => {
  const relayId = c.req.param("relayId");
  const instances = getRelayInstances();
  if (!instances?.some((i) => i.id === relayId)) {
    return c.json({ error: "relay not found", relayId }, 404);
  }
  return c.json({ status: "ok", relayId, timestamp: new Date().toISOString() });
});
