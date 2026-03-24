# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2026-03-24

### Fixed

- **`GET /:relayId/health`** includes `version` in multi-relay mode — relay-api and relay-panel call this path per relay; without it, `version` was only on `GET /health`.

### Changed

- **`getVersion()`** — optional `RELAY_AGENT_VERSION` env override; only accepts `package.json` when `name` is `@bitmacro/relay-agent`.
- **CLI** (`-v` / `--version`) uses the shared `getVersion()` implementation.

### Documentation

- **docker-compose** — comment that `build` + `image: ...:latest` overwrites a freshly pulled image; use `pull` + `up` without `build` for GHCR-only deploys.

## [0.2.2] - 2026-03-24

### Fixed

- **Docker (multi-relay):** mount host `nostr/*/data` to `/app/nostr/*/data` and set `RELAY_INSTANCES.strfryDb` to `/app/nostr/*/data`. Production `strfry.conf` next to relay containers typically uses `db="./data/"`; mounting at `strfry-db` made strfry look for `./data` and fail with `mdb_env_open: No such file or directory`.
- **Dockerfile:** `HEALTHCHECK` on `http://127.0.0.1:7800/health` (overrides strfry base image check on port 7777).

## [0.2.1] - 2026-03-23

### Fixed

- `getVersion()` — add /app/package.json as first candidate (Docker), fix version not showing in `/health`

## [0.2.0] - 2026-03-23

### Added

- **Multi-relay** — one agent, N relays via `RELAY_INSTANCES` env
- Routes `/:relayId/stats`, `/:relayId/events`, `/:relayId/policy`, etc. with per-relay config
- `docker-compose.relay-agent.yml` fragment for deployment
- Per-relay strfry mutex — serializes LMDB access per db to reduce 503 "Resource temporarily unavailable"
- `GET /health` returns `version` field — verify which relay-agent build is running

### Fixed

- Mount strfry data at `/app/nostr/*/strfry-db` — `strfry.conf` uses `db="./strfry-db/"`, so relay-agent must mount host data there. Fixes `mdb_env_open: No such file or directory` on `/events` and stats.

### Changed

- `RELAY_INSTANCES` JSON array replaces single-relay env vars when set
- Backward compatible: without `RELAY_INSTANCES`, behaves as v0.1 (single-relay)
- Docker compose volumes: `./nostr/*/data` → `/app/nostr/*/strfry-db`
- `RELAY_INSTANCES` strfryDb paths use `strfry-db`
- Docker publish workflow: trigger on pre-release tags (`v*.*.*-*`)

## [0.1.5] - 2026-03-21

- Version bump 0.1.5

## [0.1.4] - 2026-03-20

### Fixed

- Resolve symlink in `getVersion()` — fixes `--version` returning `0.0.0` when run via npx (symlink in `node_modules/.bin/`)
- Add `--version` and `--help` flags to CLI — fixes crash when passing unknown options (e.g. `npx @bitmacro/relay-agent --version`)

### Added

- `GET /policy` — list whitelist entries (filter comments and invalid pubkeys)
- `-v, --version` — prints package version and exits
- `-h, --help` — prints usage and exits

## [0.1.2] - 2026-03-20

- Package.json cleanup and NPM_TOKEN docs (fix/npm-publish-token)

## [0.1.1] - 2026-03-20

### Fixed

- Add OIDC permissions (id-token: write) to publish workflow for npm provenance

## [0.1.0] - 2026-03-20

### Added

- REST API with Hono framework
- Bearer token authentication
- `GET /health` — health check (public)
- `GET /events` — list events with NIP-01 filter (kinds, authors, since, until, limit)
- `DELETE /events/:id` — delete event by id
- `GET /stats` — relay statistics (total_events, db_size, uptime, version)
- `POST /policy/block` — block pubkey (whitelist + delete events)
- `POST /policy/allow` — allow pubkey (whitelist)
- `GET /users` — list unique pubkeys with events
- strfry adapter with `scanEvents`, `deleteEvent`, `deleteByPubkey`, `getStats`, `listUsers`, `blockPubkey`, `allowPubkey`
- Adapter architecture prepared for nostr-rs-relay and khatru
- Dockerfile for containerized deployment
- Vitest unit and integration tests
- GitHub Actions CI and publish workflows
