/**
 * Public API types for relay-agent.
 * Consumed by relay-panel.bitmacro.cloud, relay-panel.bitmacro.pro and other clients.
 */

/** Relay statistics (GET /stats) */
export interface RelayStats {
  total_events: number;
  db_size: string;
  uptime: number;
  version: string;
}

/** NIP-01 standard event (GET /events) */
export interface RelayEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** User with policy status (GET /users) */
export interface RelayUser {
  pubkey: string;
  status: "allowed" | "blocked" | "unknown";
}
