import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "../../src/middleware/auth.js";
import { clearRelayInstancesCache } from "../../src/config/relay-instances.js";

describe("auth middleware", () => {
  const originalToken = process.env.RELAY_AGENT_TOKEN;
  const originalInstances = process.env.RELAY_INSTANCES;

  afterEach(() => {
    process.env.RELAY_AGENT_TOKEN = originalToken;
    process.env.RELAY_INSTANCES = originalInstances;
    clearRelayInstancesCache();
  });

  describe("v0.1.x single-relay mode", () => {
    beforeEach(() => {
      clearRelayInstancesCache();
      delete process.env.RELAY_INSTANCES;
      process.env.RELAY_AGENT_TOKEN = "secret123";
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

    it("skips auth for /health", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/health", (c) => c.json({ status: "ok" }));

      const res = await app.request("http://localhost/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
    });
  });

  describe("v0.2.x multi-relay mode", () => {
    const instances = JSON.stringify([
      { id: "public", token: "token-public", strfryConfig: "/etc/public.conf", strfryDb: "/var/public" },
      { id: "private", token: "token-private", strfryConfig: "/etc/private.conf", strfryDb: "/var/private" },
    ]);

    beforeEach(() => {
      clearRelayInstancesCache();
      process.env.RELAY_INSTANCES = instances;
      delete process.env.RELAY_AGENT_TOKEN;
    });

    it("skips auth for /health", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/health", (c) => c.json({ status: "ok" }));

      const res = await app.request("http://localhost/health");
      expect(res.status).toBe(200);
    });

    it("skips auth for /:relayId/health", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/:relayId/health", (c) => c.json({ status: "ok", relayId: c.req.param("relayId") }));

      const res = await app.request("http://localhost/public/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok", relayId: "public" });
    });

    it("returns 401 for /:relayId/stats without token", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/:relayId/stats", (c) => c.json({ ok: true }));

      const res = await app.request("http://localhost/public/stats");
      expect(res.status).toBe(401);
    });

    it("returns 401 for wrong token on /:relayId/stats", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/:relayId/stats", (c) => c.json({ ok: true }));

      const res = await app.request("http://localhost/public/stats", {
        headers: { Authorization: "Bearer wrong" },
      });
      expect(res.status).toBe(401);
    });

    it("passes through for correct per-relay token", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/:relayId/stats", (c) => c.json({ relayId: c.req.param("relayId") }));

      const res = await app.request("http://localhost/public/stats", {
        headers: { Authorization: "Bearer token-public" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ relayId: "public" });
    });

    it("validates token against specific relay", async () => {
      const app = new Hono();
      app.use("*", authMiddleware);
      app.get("/:relayId/stats", (c) => c.json({ relayId: c.req.param("relayId") }));

      const res = await app.request("http://localhost/private/stats", {
        headers: { Authorization: "Bearer token-public" },
      });
      expect(res.status).toBe(401);
    });
  });
});
