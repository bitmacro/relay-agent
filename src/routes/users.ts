import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import { getRelayInstance } from "../config/relay-instances.js";

/** v0.1.x: /users */
export const usersLegacyRoutes = new Hono();
usersLegacyRoutes.get("/users", async (c) => {
  const limitParam = c.req.query("limit");
  let limit: number | undefined;
  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (Number.isNaN(n)) return c.json({ error: "invalid limit" }, 400);
    limit = n;
  }
  try {
    const pubkeys = await strfry.listUsers(limit ?? 1000, null);
    return c.json({ users: pubkeys });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

/** v0.2.x: /:relayId/users */
export const usersMultiRoutes = new Hono();
usersMultiRoutes.get("/:relayId/users", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  const limitParam = c.req.query("limit");
  let limit: number | undefined;
  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (Number.isNaN(n)) return c.json({ error: "invalid limit" }, 400);
    limit = n;
  }
  try {
    const cfg = {
      strfryConfig: instance.strfryConfig,
      strfryDb: instance.strfryDb,
      whitelistPath: instance.whitelistPath,
    };
    const pubkeys = await strfry.listUsers(limit ?? 1000, cfg);
    return c.json({ users: pubkeys });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
