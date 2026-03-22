# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-22

### Added

- **Multi-relay (v0.2)** — one agent, N relays via `RELAY_INSTANCES` env
- Routes `/:relayId/stats`, `/:relayId/events`, `/:relayId/policy`, etc. with per-relay config
- `docker-compose.relay-agent.yml` fragment for v0.2 deployment
- Per-relay strfry mutex — serializes LMDB access per db to reduce 503 "Resource temporarily unavailable"

### Changed

- `RELAY_INSTANCES` JSON array replaces single-relay env vars when set
- Backward compatible: without `RELAY_INSTANCES`, behaves as v0.1 (single-relay)

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
