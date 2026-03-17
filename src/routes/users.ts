import { Hono } from "hono";
import * as strfry from "../adapters/strfry.js";

export const usersRoutes = new Hono();

usersRoutes.get("/users", async (c) => {
  try {
    const limitParam = c.req.query("limit");
    let limit: number | undefined;
    if (limitParam) {
      const n = parseInt(limitParam, 10);
      if (Number.isNaN(n)) return c.json({ error: "invalid limit" }, 400);
      limit = n;
    }
    const pubkeys = await strfry.listUsers(limit);
    return c.json({ users: pubkeys });
  } catch {
    return c.json({ error: "relay unavailable" }, 503);
  }
});
