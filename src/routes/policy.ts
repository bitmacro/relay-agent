import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";

const PUBKEY_REGEX = /^[0-9a-f]{64}$/;

export const policyRoutes = new Hono();

policyRoutes.post("/policy/block", async (c) => {
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") {
      return c.json({ error: "pubkey is required" }, 400);
    }
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) {
      return c.json({ error: "invalid pubkey format" }, 400);
    }
    await strfry.blockPubkey(pubkey);
    return c.json({ blocked: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

policyRoutes.post("/policy/allow", async (c) => {
  try {
    const body = await c.req.json<{ pubkey: string }>();
    const { pubkey } = body;
    if (!pubkey || typeof pubkey !== "string") {
      return c.json({ error: "pubkey is required" }, 400);
    }
    if (!PUBKEY_REGEX.test(pubkey.toLowerCase())) {
      return c.json({ error: "invalid pubkey format" }, 400);
    }
    await strfry.allowPubkey(pubkey);
    return c.json({ allowed: pubkey });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
