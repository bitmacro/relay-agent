import type { Context, Next } from "hono";

const UNAUTHORIZED_JSON = { error: "unauthorized" } as const;

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const expectedToken = process.env.RELAY_AGENT_TOKEN;

  if (!expectedToken) {
    return c.json(UNAUTHORIZED_JSON, 401);
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(UNAUTHORIZED_JSON, 401);
  }

  const token = authHeader.slice(7);
  if (token !== expectedToken) {
    return c.json(UNAUTHORIZED_JSON, 401);
  }

  await next();
}
