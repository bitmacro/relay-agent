import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import { getRelayInstances, getRelayInstance, isMultiRelayMode } from "../config/relay-instances.js";
import { getVersion } from "../lib/version.js";

export const healthRoutes = new Hono();

// GET /health — no auth; lists all relayIds when multi-relay, else simple ok
healthRoutes.get("/health", async (c) => {
  const agentVersion = getVersion();
  if (isMultiRelayMode()) {
    const instances = getRelayInstances() ?? [];
    return c.json({
      status: "ok",
      version: agentVersion,
      timestamp: new Date().toISOString(),
      relayIds: instances.map((i) => i.id),
    });
  }
  const strfry_version = await strfry.getStrfryBinaryVersion(null);
  return c.json({
    status: "ok",
    version: agentVersion,
    strfry_version,
    timestamp: new Date().toISOString(),
  });
});

/** v0.2.x only: GET /:relayId/health */
export const healthMultiRoutes = new Hono();
healthMultiRoutes.get("/:relayId/health", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) {
    return c.json({ error: "relay not found", relayId }, 404);
  }
  const strfry_version = await strfry.getStrfryBinaryVersion({
    strfryConfig: instance.strfryConfig,
    strfryDb: instance.strfryDb,
    whitelistPath: instance.whitelistPath,
  });
  return c.json({
    status: "ok",
    relayId,
    version: getVersion(),
    strfry_version,
    timestamp: new Date().toISOString(),
  });
});
