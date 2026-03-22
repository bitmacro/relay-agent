import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import { getRelayInstance } from "../config/relay-instances.js";
import type { NostrFilter } from "../adapters/types.js";

function parseFilter(c: { req: { query: (k: string) => string | undefined } }): NostrFilter | null {
  const kinds = c.req.query("kinds");
  const authors = c.req.query("authors");
  const since = c.req.query("since");
  const until = c.req.query("until");
  const limit = c.req.query("limit");

  const filter: NostrFilter = {};
  if (kinds) {
    const parsed = kinds.split(",").map((k) => parseInt(k, 10));
    if (parsed.some((n) => Number.isNaN(n))) return null;
    filter.kinds = parsed;
  }
  if (authors) filter.authors = authors.split(",").map((a) => a.trim());
  if (since) {
    const n = parseInt(since, 10);
    if (Number.isNaN(n)) return null;
    filter.since = n;
  }
  if (until) {
    const n = parseInt(until, 10);
    if (Number.isNaN(n)) return null;
    filter.until = n;
  }
  if (limit) {
    const n = parseInt(limit, 10);
    if (Number.isNaN(n)) return null;
    filter.limit = n;
  }
  return filter;
}

/** v0.1.x: /events, /events/:id */
export const eventsLegacyRoutes = new Hono();
eventsLegacyRoutes.get("/events", async (c) => {
  const filter = parseFilter(c);
  if (!filter) return c.json({ error: "invalid query params" }, 400);
  try {
    const events = await strfry.scanEvents(filter, null);
    return c.json(events);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
eventsLegacyRoutes.delete("/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await strfry.deleteEvent(id, null);
    return c.json({ deleted: id });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

/** v0.2.x: /:relayId/events, /:relayId/events/:id */
export const eventsMultiRoutes = new Hono();
eventsMultiRoutes.get("/:relayId/events", async (c) => {
  const relayId = c.req.param("relayId");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  const filter = parseFilter(c);
  if (!filter) return c.json({ error: "invalid query params" }, 400);
  try {
    const cfg = {
      strfryConfig: instance.strfryConfig,
      strfryDb: instance.strfryDb,
      whitelistPath: instance.whitelistPath,
    };
    const events = await strfry.scanEvents(filter, cfg);
    return c.json(events);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
eventsMultiRoutes.delete("/:relayId/events/:id", async (c) => {
  const relayId = c.req.param("relayId");
  const id = c.req.param("id");
  const instance = getRelayInstance(relayId);
  if (!instance) return c.json({ error: "relay not found", relayId }, 404);
  try {
    const cfg = {
      strfryConfig: instance.strfryConfig,
      strfryDb: instance.strfryDb,
      whitelistPath: instance.whitelistPath,
    };
    await strfry.deleteEvent(id, cfg);
    return c.json({ deleted: id });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
