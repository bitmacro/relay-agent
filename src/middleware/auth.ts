import type { Context, Next } from "hono";
import { getRelayInstance, isMultiRelayMode } from "../config/relay-instances.js";

const UNAUTHORIZED_JSON = { error: "unauthorized" } as const;

function getBearerToken(c: Context): string | null {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;

  // /health has no auth (both modes)
  if (path === "/health") return next();

  if (isMultiRelayMode()) {
    // /:relayId/health has no auth
    const segments = path.split("/").filter(Boolean);
    if (segments.length >= 2 && segments[1] === "health") return next();
  }

  const token = getBearerToken(c);
  if (!token) return c.json(UNAUTHORIZED_JSON, 401);

  if (isMultiRelayMode()) {
    const segments = path.split("/").filter(Boolean);
    const relayId = segments[0];
    if (!relayId) return c.json(UNAUTHORIZED_JSON, 401);

    const instance = getRelayInstance(relayId);
    if (!instance) return c.json(UNAUTHORIZED_JSON, 401);
    if (token !== instance.token) return c.json(UNAUTHORIZED_JSON, 401);

    c.set("relayInstance", instance);
  } else {
    // v0.1.x: single relay, global token
    const expectedToken = process.env.RELAY_AGENT_TOKEN;
    if (!expectedToken) return c.json(UNAUTHORIZED_JSON, 401);
    if (token !== expectedToken) return c.json(UNAUTHORIZED_JSON, 401);
  }

  await next();
}
