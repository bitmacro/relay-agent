import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import { getRelayInstance } from "../config/relay-instances.js";
import type { RelayStats } from "../types/api.js";

/** v0.1.x: /stats (single relay) */
export const statsLegacyRoutes = new Hono();
statsLegacyRoutes.get("/stats", async (c) => {
  try {
    const raw = await strfry.getStats(null);
    const stats: RelayStats = {
      total_events: raw.total_events,
      db_size: raw.db_size,
      uptime: raw.uptime_seconds,
      version: raw.strfry_version,
    };
    return c.json(stats);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

/** v0.2.x: /:relayId/stats (multi relay) */
export const statsMultiRoutes = new Hono();
statsMultiRoutes.get("/:relayId/stats", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);

  try {
    const cfg = {
      strfryConfig: instance.strfryConfig,
      strfryDb: instance.strfryDb,
      whitelistPath: instance.whitelistPath,
    };
    const raw = await strfry.getStats(cfg);
    const stats: RelayStats = {
      total_events: raw.total_events,
      db_size: raw.db_size,
      uptime: raw.uptime_seconds,
      version: raw.strfry_version,
    };
    return c.json(stats);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
