import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import { getRelayInstance } from "../config/relay-instances.js";

const PUBKEY_REGEX = /^[0-9a-f]{64}$/;

function cfgFromInstance(
  instance: { strfryConfig: string; strfryDb: string; whitelistPath?: string }
) {
  return {
    strfryConfig: instance.strfryConfig,
    strfryDb: instance.strfryDb,
    whitelistPath: instance.whitelistPath,
  };
}

function normalizePubkeyParam(raw: string | undefined): string | null {
  if (!raw) return null;
  const pk = raw.trim().toLowerCase();
  return PUBKEY_REGEX.test(pk) ? pk : null;
}

/** v0.1.x: /policy, /policy/block, /policy/allow */
export const policyLegacyRoutes = new Hono();
policyLegacyRoutes.get("/policy/blocked", async (c) => {
  try {
    const { blocked, count } = await strfry.listBlockedPubkeys(null);
    return c.json({ blocked, count });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyLegacyRoutes.get("/policy", async (c) => {
  try {
    const entries = await strfry.getPolicyEntries(null);
    return c.json({ entries });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyLegacyRoutes.delete("/policy/allow/:pubkey", async (c) => {
  const pubkey = normalizePubkeyParam(c.req.param("pubkey"));
  if (!pubkey) return c.json({ error: "invalid pubkey format" }, 400);
  try {
    const removed = await strfry.removeAllowPubkey(pubkey, null);
    if (!removed) return c.json({ error: "not_found", detail: "pubkey not in allow list" }, 404);
    return c.json({ ok: true, pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyLegacyRoutes.delete("/policy/block/:pubkey", async (c) => {
  const pubkey = normalizePubkeyParam(c.req.param("pubkey"));
  if (!pubkey) return c.json({ error: "invalid pubkey format" }, 400);
  try {
    const removed = await strfry.removeBlockPubkey(pubkey, null);
    if (!removed) return c.json({ error: "not_found", detail: "pubkey not in block list" }, 404);
    return c.json({ ok: true, pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyLegacyRoutes.post("/policy/block", async (c) => {
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") return c.json({ error: "pubkey is required" }, 400);
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) return c.json({ error: "invalid pubkey format" }, 400);
    await strfry.blockPubkey(pubkey, null);
    return c.json({ blocked: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyLegacyRoutes.post("/policy/allow", async (c) => {
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") return c.json({ error: "pubkey is required" }, 400);
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) return c.json({ error: "invalid pubkey format" }, 400);
    await strfry.allowPubkey(pubkey, null);
    return c.json({ allowed: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

/** v0.2.x: /:relayId/policy, /:relayId/policy/block, /:relayId/policy/allow */
export const policyMultiRoutes = new Hono();
policyMultiRoutes.get("/:relayId/policy/blocked", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  try {
    const { blocked, count } = await strfry.listBlockedPubkeys(cfgFromInstance(instance));
    return c.json({ blocked, count });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyMultiRoutes.delete("/:relayId/policy/allow/:pubkey", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  const pubkey = normalizePubkeyParam(c.req.param("pubkey"));
  if (!pubkey) return c.json({ error: "invalid pubkey format" }, 400);
  try {
    const removed = await strfry.removeAllowPubkey(pubkey, cfgFromInstance(instance));
    if (!removed) return c.json({ error: "not_found", detail: "pubkey not in allow list" }, 404);
    return c.json({ ok: true, pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyMultiRoutes.delete("/:relayId/policy/block/:pubkey", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  const pubkey = normalizePubkeyParam(c.req.param("pubkey"));
  if (!pubkey) return c.json({ error: "invalid pubkey format" }, 400);
  try {
    const removed = await strfry.removeBlockPubkey(pubkey, cfgFromInstance(instance));
    if (!removed) return c.json({ error: "not_found", detail: "pubkey not in block list" }, 404);
    return c.json({ ok: true, pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyMultiRoutes.get("/:relayId/policy", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  try {
    const entries = await strfry.getPolicyEntries(cfgFromInstance(instance));
    return c.json({ entries });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyMultiRoutes.post("/:relayId/policy/block", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") return c.json({ error: "pubkey is required" }, 400);
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) return c.json({ error: "invalid pubkey format" }, 400);
    await strfry.blockPubkey(pubkey, cfgFromInstance(instance));
    return c.json({ blocked: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
policyMultiRoutes.post("/:relayId/policy/allow", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") return c.json({ error: "pubkey is required" }, 400);
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) return c.json({ error: "invalid pubkey format" }, 400);
    await strfry.allowPubkey(pubkey, cfgFromInstance(instance));
    return c.json({ allowed: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
