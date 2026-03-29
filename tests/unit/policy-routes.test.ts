import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import * as strfry from "../../src/adapters/strfry.js";
import { policyLegacyRoutes, policyMultiRoutes } from "../../src/routes/policy.js";
import { authMiddleware } from "../../src/middleware/auth.js";
import { clearRelayInstancesCache } from "../../src/config/relay-instances.js";

const PK = "a".repeat(64);

describe("policy HTTP routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("v0.2 multi-relay", () => {
    beforeEach(() => {
      clearRelayInstancesCache();
      process.env.RELAY_INSTANCES = JSON.stringify([
        { id: "pub", token: "tok-pub", strfryConfig: "/c", strfryDb: "/var/db" },
      ]);
      delete process.env.RELAY_AGENT_TOKEN;
    });

    afterEach(() => {
      delete process.env.RELAY_INSTANCES;
      clearRelayInstancesCache();
    });

    function app() {
      const h = new Hono();
      h.use("*", authMiddleware);
      h.route("/", policyMultiRoutes);
      return h;
    }

    it("GET /:relayId/policy/blocked returns blocked list", async () => {
      vi.spyOn(strfry, "listBlockedPubkeys").mockResolvedValue({
        blocked: [PK],
        count: 1,
      });
      const res = await app().request("http://localhost/pub/policy/blocked", {
        headers: { Authorization: "Bearer tok-pub" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ blocked: [PK], count: 1 });
    });

    it("DELETE /:relayId/policy/allow/:pubkey 200 when removed", async () => {
      vi.spyOn(strfry, "removeAllowPubkey").mockResolvedValue(true);
      const res = await app().request(`http://localhost/pub/policy/allow/${PK}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer tok-pub" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, pubkey: PK });
    });

    it("DELETE /:relayId/policy/allow/:pubkey 404 when not in allow list", async () => {
      vi.spyOn(strfry, "removeAllowPubkey").mockResolvedValue(false);
      const res = await app().request(`http://localhost/pub/policy/allow/${PK}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer tok-pub" },
      });
      expect(res.status).toBe(404);
    });

    it("DELETE /:relayId/policy/allow/:pubkey 400 for invalid pubkey", async () => {
      const res = await app().request("http://localhost/pub/policy/allow/notvalidhex", {
        method: "DELETE",
        headers: { Authorization: "Bearer tok-pub" },
      });
      expect(res.status).toBe(400);
    });

    it("DELETE /:relayId/policy/block/:pubkey 200 when removed", async () => {
      vi.spyOn(strfry, "removeBlockPubkey").mockResolvedValue(true);
      const res = await app().request(`http://localhost/pub/policy/block/${PK}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer tok-pub" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, pubkey: PK });
    });
  });

  describe("v0.1 legacy", () => {
    beforeEach(() => {
      clearRelayInstancesCache();
      delete process.env.RELAY_INSTANCES;
      process.env.RELAY_AGENT_TOKEN = "legacy-secret";
    });

    afterEach(() => {
      delete process.env.RELAY_AGENT_TOKEN;
      clearRelayInstancesCache();
    });

    function app() {
      const h = new Hono();
      h.use("*", authMiddleware);
      h.route("/", policyLegacyRoutes);
      return h;
    }

    it("GET /policy/blocked", async () => {
      vi.spyOn(strfry, "listBlockedPubkeys").mockResolvedValue({ blocked: [], count: 0 });
      const res = await app().request("http://localhost/policy/blocked", {
        headers: { Authorization: "Bearer legacy-secret" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ blocked: [], count: 0 });
    });

    it("DELETE /policy/allow/:pubkey", async () => {
      vi.spyOn(strfry, "removeAllowPubkey").mockResolvedValue(true);
      const res = await app().request(`http://localhost/policy/allow/${PK}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer legacy-secret" },
      });
      expect(res.status).toBe(200);
    });
  });
});
