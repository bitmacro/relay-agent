import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "../../src/middleware/auth.js";

describe("auth middleware", () => {
  const originalToken = process.env.RELAY_AGENT_TOKEN;

  beforeEach(() => {
    process.env.RELAY_AGENT_TOKEN = "secret123";
  });

  afterEach(() => {
    process.env.RELAY_AGENT_TOKEN = originalToken;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("http://localhost/test");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when token is wrong", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("http://localhost/test", {
      headers: { Authorization: "Bearer wrong_token" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("passes through when token is correct", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("http://localhost/test", {
      headers: { Authorization: "Bearer secret123" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
