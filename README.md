# @bitmacro/relay-agent

[![CI](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@bitmacro/relay-agent.svg)](https://www.npmjs.com/package/@bitmacro/relay-agent)
[![Docker GHCR](https://img.shields.io/badge/ghcr.io-bitmacro%2Frelay-agent-2496ED?logo=docker)](https://github.com/bitmacro/relay-agent/pkgs/container/relay-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono)](https://hono.dev/)
[![Vitest](https://img.shields.io/badge/test-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![tsup](https://img.shields.io/badge/build-tsup-EFC942)](https://github.com/egoist/tsup)
[![strfry](https://img.shields.io/badge/runtime-strfry%20CLI-394AAB)](https://hub.docker.com/r/dockurr/strfry)

**[→ Web UI: relay-panel.bitmacro.io](https://relay-panel.bitmacro.io)**  
**[→ BitMacro Ecosystem: bitmacro.io](https://bitmacro.io)**

**Manage your Nostr relay without touching the terminal.**

`relay-agent` is a REST API agent that runs on your relay server and translates HTTP requests into strfry CLI commands. It is part of the [BitMacro Relay Manager](https://bitmacro.io) ecosystem.

| Project | Description | License |
|---------|-------------|---------|
| **relay-agent** | This repo — REST API for strfry | MIT |
| [@bitmacro/relay-connect](https://github.com/bitmacro/relay-connect) | BitMacro Connect SDK (NIP-46 / NIP-07) | MIT |
| [relay-connect-web](https://github.com/bitmacro/relay-connect-web) | Connect UI + `/signer` proxy (Next.js) | MIT |
| [relay-api](https://github.com/bitmacro/relay-api) | Central hub (Supabase, proxy) | Private |
| [relay-panel](https://github.com/bitmacro/relay-panel) | Relay management UI | BSL 1.1 |

---

## Quick Start

### Via npx

```bash
npx @bitmacro/relay-agent --port 7800 --token your-secret-token
```

Use `--version` or `--help` to check version or CLI options.

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

**Multiple relays (v0.2):** One agent, N relays via `RELAY_INSTANCES`. Use `docker-compose.relay-agent.yml` (fragment) or `docker-compose.yml` (standalone).

### Server deployment (v0.2 multi-relay)

```bash
# 1. Clone relay-agent into a subdir next to your docker-compose.yml
git clone https://github.com/bitmacro/relay-agent.git relay-agent

# 2. Configure .env (single token for all relays)
echo "RELAY_AGENT_TOKEN=your-secret-token" >> .env

# 3. Build and start (requires relay_private, relay_public, relay_paid, network bitmacro in parent compose)
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml build relay-agent
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml up -d relay-agent
```

Prerequisites: `nostr/{public,private,paid}/` must have `strfry.conf`, `whitelist.txt`, `data/`.


---

## Operational Commands

### v0.2 multi-relay

```bash
# Build and start
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml up -d --build relay-agent

# View logs
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml logs -f relay-agent

# Stop
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml stop relay-agent
```

### Standalone (from relay-agent dir)

```bash
cd relay-agent && docker compose up -d
```

### Smoke Test

```bash
# v0.2: health lists relay IDs and version
curl http://localhost:7810/health
# {"status":"ok","version":"0.2.3","relayIds":["public","private","paid"],...}
# Per-relay: GET /:relayId/health includes the same package version field.

# v0.2: stats for a specific relay (replace TOKEN and relay id)
curl -H "Authorization: Bearer TOKEN" http://localhost:7810/private/stats
```

---

## REST API Endpoints

### v0.2 multi-relay (RELAY_INSTANCES set)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/health` | List active relay IDs | no |
| `GET` | `/:relayId/health` | Health for relay | no |
| `GET` | `/:relayId/stats` | Relay statistics | Bearer |
| `GET` | `/:relayId/events` | List events | Bearer |
| `DELETE` | `/:relayId/events/:id` | Delete event | Bearer |
| `GET` | `/:relayId/policy` | Policy entries | Bearer |
| `POST` | `/:relayId/policy/block` | Block pubkey | Bearer |
| `POST` | `/:relayId/policy/allow` | Allow pubkey | Bearer |
| `GET` | `/:relayId/users` | List pubkeys | Bearer |

`relayId` = logical ID from RELAY_INSTANCES (e.g. `public`, `private`, `paid`). Must match `agent_relay_id` in relay_configs.

### v0.1 single-relay (no RELAY_INSTANCES)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/stats`, `/events`, `/policy`, `/users` | Same as above, no prefix |

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

### v0.2 multi-relay

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_INSTANCES` | — | JSON array of `{id, token, strfryConfig, strfryDb, whitelistPath?}` |
| `RELAY_AGENT_TOKEN` | — | Not used when RELAY_INSTANCES is set |
| `STRFRY_BIN` | `strfry` | Path to strfry binary |
| `PORT` | `7800` | HTTP server port |
| `ALLOWED_ORIGINS` | — | Comma-separated extra CORS origins |

### v0.1 single-relay

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_AGENT_TOKEN` | — | **Required.** Bearer token for API auth |
| `STRFRY_BIN` | `strfry` | Path to strfry binary |
| `STRFRY_DB_PATH` | `./strfry-db` | Path to strfry database directory |
| `STRFRY_CONFIG` | — | Path to strfry config file |
| `WHITELIST_PATH` | `/etc/strfry/whitelist.txt` | Path to whitelist file |
| `PORT` | `7800` | HTTP server port |
| `ALLOWED_ORIGINS` | — | Comma-separated extra CORS origins |

---

## Compatibility

| relay-agent | strfry | Mode |
|-------------|--------|------|
| 0.1.x | 1.0.x | Single-relay |
| 0.2.x | 1.0.x | Multi-relay (RELAY_INSTANCES) |

---

## Architecture

```
relay-panel
    │  HTTP + JWT
    ▼
relay-api (Vercel)
    │  HTTP REST + Bearer JWT
    ▼
relay-agent (this repo)
    │  child_process spawn()
    ▼
strfry (local C++ process / LMDB)
```

The relay-agent is **stateless** — it has no database. State lives in Supabase, managed by relay-api. The relay-agent only translates HTTP calls into strfry CLI commands.

---

## Troubleshooting

### 503 "relay unavailable"

1. **Capture the error** — run logs in one terminal, then curl in another:
   ```bash
   # v0.2
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml logs -f relay-agent
   curl -H "Authorization: Bearer TOKEN" "http://localhost:7810/private/events?limit=3"
   ```
   The strfry stderr will appear in the logs.

2. **LMDB "Resource temporarily unavailable"** — relay and relay-agent share the same db. Increase `maxreaders` in your **relay's** strfry.conf (e.g. `./nostr/private/strfry.conf`):
   ```
   dbParams {
     maxreaders = 512
   }
   ```
   Then restart the relay: `docker restart relay_private`

3. **Verify db path** — relay-agent mounts `./nostr/private/data:/app/nostr/private/data` so it matches production `strfry.conf` with `db="./data/"` (same layout as `relay_private`). If you see `mdb_env_open: No such file or directory`, the mount path or `db=` in `strfry.conf` does not match. Check your main `docker-compose.yml`:
   ```bash
   grep -A5 relay_private docker-compose.yml
   ```

4. **Test strfry inside container** (v0.2):
   ```bash
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agent.yml run --rm relay-agent sh -c 'ls -la /app/nostr/private/data && /app/strfry --config /app/nostr/private/strfry.conf scan "{}" | head -3'
   ```
   If `data.mdb` is missing or strfry fails, fix the volume path.

---

## Security

- **Run on a private network.** The relay-agent should run on the operator's server and **never be exposed directly to the internet**.
- Access is controlled by the relay-api, which proxies requests with a shared Bearer token.
- Use a strong, random token in production. Rotate it if compromised.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and PR guidelines.
