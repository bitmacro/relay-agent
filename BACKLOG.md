# Backlog — relay-agent

Ideas and improvements; not a committed roadmap. Prefer GitHub Issues for tracked work.

---

## LMDB contention: `strfry relay` and CLI on the same directory

**Context:** With `RELAY_INSTANCES`, the agent runs `strfry` subcommands (`scan`, stats, etc.) against the same LMDB directory as the running `strfry relay` container. Under **high write/read load** (typical **public** relays) this increases LMDB contention (`mdb_txn_begin: Resource temporarily unavailable`); **private/paid** paths are usually lighter.

**Mitigation shipped (agent ≥ 0.2.9):** env **`RELAY_STATS_SKIP_EVENT_COUNT_IDS`** — comma-separated instance `id`s — skips the heavy `strfry scan "{}"` on **`GET /:id/stats`**; returns **`total_events: null`**, keeps `db_size`, uptime, version. BitMacro VPS compose sets `public` alongside **`relay-agent-vps`** ([`bitmacro-cloud`](https://github.com/bitmacro/bitmacro-cloud) `docker-compose.yml`).

**Historical (BitMacro):** During the 2026 relay split, the first cut was **no agent** on the **public** VPS stack to avoid contention; that was **revisited** when `relay-agent-vps` shipped with skip-scan for `public`. See `bitmacro-docs/attachments/RELAY_SIGNER_MIGRATION_CHECKLIST.md`.

**Still open:**

- [ ] **Resilience:** explicit backoff / softer errors on LMDB `EAGAIN`, structured metrics/logs.
- [ ] **Docs:** cookbook for “high volume” relays vs catalogue-only relays and when **not** to mount an agent instance.

---

*Last updated: 2026-05-07.*
