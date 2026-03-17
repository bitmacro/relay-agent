export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface RelayStats {
  total_events: number;
  db_size: string;
  uptime_seconds: number;
  strfry_version: string;
}

export interface RelayAdapter {
  scanEvents(filter: NostrFilter): Promise<NostrEvent[]>;
  deleteEvent(id: string): Promise<void>;
  deleteByPubkey(pubkey: string): Promise<void>;
  getStats(): Promise<RelayStats>;
  listUsers(limit?: number): Promise<string[]>;
  blockPubkey(pubkey: string): Promise<void>;
  allowPubkey(pubkey: string): Promise<void>;
}
