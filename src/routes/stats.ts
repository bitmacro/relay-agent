import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import type { RelayStats } from "../types/api.js";

export const statsRoutes = new Hono();

statsRoutes.get("/stats", async (c) => {
  try {
    const raw = await strfry.getStats();
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
