/**
 * Multi-relay configuration via RELAY_INSTANCES env var.
 * When set, the agent serves N relays with per-relay tokens and strfry configs.
 */
export interface RelayInstance {
  id: string;
  token: string;
  strfryConfig: string;
  strfryDb: string;
  whitelistPath?: string;
}

let cachedInstances: RelayInstance[] | null = null;

function parseRelayInstances(): RelayInstance[] | null {
  const raw = process.env.RELAY_INSTANCES;
  if (!raw || typeof raw !== "string") return null;

  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return null;

    const instances: RelayInstance[] = [];
    const defaultWhitelist = process.env.WHITELIST_PATH ?? "/etc/strfry/whitelist.txt";

    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const id = typeof obj.id === "string" ? obj.id.trim() : "";
      const token = typeof obj.token === "string" ? obj.token.trim() : "";
      const strfryConfig = typeof obj.strfryConfig === "string" ? obj.strfryConfig.trim() : "";
      const strfryDb = typeof obj.strfryDb === "string" ? obj.strfryDb.trim() : "";

      if (!id || !token || !strfryConfig || !strfryDb) continue;
      if (instances.some((i) => i.id === id)) continue; // dedup

      instances.push({
        id,
        token,
        strfryConfig,
        strfryDb,
        whitelistPath: typeof obj.whitelistPath === "string" ? obj.whitelistPath.trim() || undefined : undefined,
      });
    }

    return instances.length > 0 ? instances : null;
  } catch {
    return null;
  }
}

export function getRelayInstances(): RelayInstance[] | null {
  if (cachedInstances === null) {
    cachedInstances = parseRelayInstances();
  }
  return cachedInstances;
}

export function getRelayInstance(relayId: string): RelayInstance | null {
  const instances = getRelayInstances();
  if (!instances) return null;
  return instances.find((i) => i.id === relayId) ?? null;
}

export function isMultiRelayMode(): boolean {
  return getRelayInstances() !== null;
}

/** Reset cache (for tests when env changes between runs) */
export function clearRelayInstancesCache(): void {
  cachedInstances = null;
}
