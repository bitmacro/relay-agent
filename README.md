# bitmacro-relay-agent

[![CI](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/bitmacro-relay-agent.svg)](https://www.npmjs.com/package/bitmacro-relay-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Manage your Nostr relay without touching the terminal.**

`relay-agent` is a REST API agent that runs on your relay server and translates HTTP requests into strfry CLI commands. It is part of the [BitMacro Relay Manager](https://bitmacro.io) ecosystem.

> [Português](README.pt.md)

---

## Quick Start

### Via npx

```bash
npx bitmacro-relay-agent --port 7800 --token your-secret-token
```

### Via Docker

Multi-arch image (amd64, arm64) at `ghcr.io/bitmacro/relay-agent`. Includes strfry binary. Mount your strfry data volume:

```bash
docker pull ghcr.io/bitmacro/relay-agent:latest
docker run -p 7800:7800 \
  -e RELAY_AGENT_TOKEN=your-secret-token \
  -v /path/to/strfry-db:/app/strfry-db \
  -v /path/to/whitelist.txt:/app/whitelist.txt \
  ghcr.io/bitmacro/relay-agent:latest
```

Or build locally: `docker build -t relay-agent .`

**Multiple relays:** Use the compose fragment. Place relay-agent next to your docker-compose.yml, then:

```bash
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml up -d relay-agent-private relay-agent-public relay-agent-paid
```

See `docker-compose.relay-agents.yml` for the full setup (1 agent per relay in v0.1).

---

## REST API Endpoints

| Method | Path | Description | Example Response |
|--------|------|-------------|------------------|
| `GET` | `/health` | Health check (no auth) | `{"status":"ok","timestamp":"..."}` |
| `GET` | `/events` | List events (NIP-01 filter) | `[{id, pubkey, kind, ...}, ...]` |
| `DELETE` | `/events/:id` | Delete event by id | `{"deleted":"<id>"}` |
| `GET` | `/stats` | Relay statistics | `{total_events, db_size, uptime, version}` |
| `POST` | `/policy/block` | Block pubkey | `{"blocked":"<pubkey>"}` |
| `POST` | `/policy/allow` | Allow pubkey | `{"allowed":"<pubkey>"}` |
| `GET` | `/users` | List unique pubkeys | `{"users":["<pubkey>", ...]}` |

### Query parameters for `GET /events`

| Param | Type | Description |
|-------|------|-------------|
| `kinds` | comma-separated | e.g. `1,3` |
| `authors` | comma-separated | pubkeys |
| `since` | unix timestamp | |
| `until` | unix timestamp | |
| `limit` | number | max events to return |

### Authentication

All endpoints except `/health` require:

```
Authorization: Bearer <your-token>
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_AGENT_TOKEN` | — | **Required.** Bearer token for API auth |
| `STRFRY_BIN` | `strfry` | Path to strfry binary |
| `STRFRY_DB_PATH` | `./strfry-db` | Path to strfry database directory |
| `STRFRY_CONFIG` | — | Path to strfry config file (for explicit db path) |
| `WHITELIST_PATH` | `/etc/strfry/whitelist.txt` | Path to whitelist file |
| `PORT` | `7800` | HTTP server port |
| `ALLOWED_ORIGINS` | — | Comma-separated extra CORS origins (defaults include `https://admin.bitmacro.io`, `http://localhost:3000`) |

---

## Compatibility

| relay-agent | strfry |
|-------------|--------|
| 0.1.x | 0.9.x |

---

## Architecture

```
bitmacro-api (Vercel)
    │  HTTP REST + Bearer JWT
    ▼
relay-agent  ← this package
    │  child_process spawn()
    ▼
strfry (local C++ process / LMDB)
```

The relay-agent is **stateless** — it has no database. State lives in Supabase, managed by bitmacro-api. The relay-agent only translates HTTP calls into strfry CLI commands.

---

## Troubleshooting

### 503 "relay unavailable"

1. **Capture the error** — run logs in one terminal, then curl in another:
   ```bash
   # Terminal 1
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml logs -f relay-agent-private
   # Terminal 2
   curl -H "Authorization: Bearer TOKEN" "http://localhost:7811/events?limit=3"
   ```
   The strfry stderr will appear in the logs.

2. **LMDB "Resource temporarily unavailable"** — relay and relay-agent share the same db. Increase `maxreaders` in your **relay's** strfry.conf (e.g. `./nostr/private/strfry.conf`):
   ```
   dbParams {
     maxreaders = 512
   }
   ```
   Then restart the relay: `docker restart relay_private`

3. **Verify db path** — relay-agent mounts `./nostr/private/data:/app/strfry-db`. Your relay (`relay_private`) must use the **same** host path for its strfry db. Check your main `docker-compose.yml`:
   ```bash
   grep -A5 relay_private docker-compose.yml
   ```

4. **Test strfry inside container**:
   ```bash
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml run --rm relay-agent-private sh -c 'ls -la /app/strfry-db && /app/strfry --config /app/strfry.conf scan "{}" | head -3'
   ```
   If `data.mdb` is missing or strfry fails, fix the volume path.

---

## Security

- **Run on a private network.** The relay-agent should run on the operator's server and **never be exposed directly to the internet**.
- Access is controlled by the bitmacro-api, which proxies requests with a shared Bearer token.
- Use a strong, random token in production. Rotate it if compromised.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and PR guidelines.
