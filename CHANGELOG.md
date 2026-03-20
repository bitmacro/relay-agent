# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Docker image includes strfry binary (from dockurr/strfry) for sidecar deployment
- `docker-compose.relay-agents.yml` — compose fragment for multiple relays (1 agent per relay)

### Fixed

- Use spawn instead of exec — avoids EACCES under systemd/nohup
- Spawn strfry binary directly (no /bin/sh) — fixes EACCES in restricted environments

### Planned (v0.2)

- Multi-relay support — single agent managing N relays via `/relays/:id/` API

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
