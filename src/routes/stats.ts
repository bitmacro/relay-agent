import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";

export const statsRoutes = new Hono();

statsRoutes.get("/stats", async (c) => {
  try {
    const stats = await strfry.getStats();
    return c.json(stats);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
