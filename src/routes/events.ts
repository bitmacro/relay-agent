import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";
import type { NostrFilter } from "../adapters/types.js";

export const eventsRoutes = new Hono();

eventsRoutes.get("/events", async (c) => {
  try {
    const kinds = c.req.query("kinds");
    const authors = c.req.query("authors");
    const since = c.req.query("since");
    const until = c.req.query("until");
    const limit = c.req.query("limit");

    const filter: NostrFilter = {};
    if (kinds) {
      const parsed = kinds.split(",").map((k) => parseInt(k, 10));
      if (parsed.some((n) => Number.isNaN(n))) {
        return c.json({ error: "invalid kinds" }, 400);
      }
      filter.kinds = parsed;
    }
    if (authors) filter.authors = authors.split(",").map((a) => a.trim());
    if (since) {
      const n = parseInt(since, 10);
      if (Number.isNaN(n)) return c.json({ error: "invalid since" }, 400);
      filter.since = n;
    }
    if (until) {
      const n = parseInt(until, 10);
      if (Number.isNaN(n)) return c.json({ error: "invalid until" }, 400);
      filter.until = n;
    }
    if (limit) {
      const n = parseInt(limit, 10);
      if (Number.isNaN(n)) return c.json({ error: "invalid limit" }, 400);
      filter.limit = n;
    }

    const events = await strfry.scanEvents(filter);
    return c.json(events);
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});

eventsRoutes.delete("/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await strfry.deleteEvent(id);
    return c.json({ deleted: id });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
