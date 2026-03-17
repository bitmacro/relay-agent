# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - TBD

### Added

- REST API with Hono framework
- Bearer token authentication
- `GET /health` — health check (public)
- `GET /events` — list events with NIP-01 filter (kinds, authors, since, until, limit)
- `DELETE /events/:id` — delete event by id
- `GET /stats` — relay statistics (total_events, db_size, uptime, strfry_version)
- `POST /policy/block` — block pubkey (whitelist + delete events)
- `POST /policy/allow` — allow pubkey (whitelist)
- `GET /users` — list unique pubkeys with events
- strfry adapter with `scanEvents`, `deleteEvent`, `deleteByPubkey`, `getStats`, `listUsers`, `blockPubkey`, `allowPubkey`
- Adapter architecture prepared for nostr-rs-relay and khatru
- Dockerfile for containerized deployment
- Vitest unit and integration tests
- GitHub Actions CI and publish workflows
