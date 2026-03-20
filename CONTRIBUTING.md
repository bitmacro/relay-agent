# Contributing to relay-agent

Thank you for your interest in contributing to relay-agent.

## Local setup

1. Clone the repository:
   ```bash
   git clone https://github.com/bitmacro/relay-agent.git
   cd relay-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. For integration tests, install strfry locally. See [strfry documentation](https://github.com/hoytech/strfry) for build instructions. Integration tests will skip if strfry is not found.

## Dev mode

```bash
npm run dev -- --port 7800 --token test123
```

Or with tsx directly:
```bash
npx tsx src/index.ts
```

## PR process

1. Fork the repository
2. Create a branch with a descriptive name:
   - `feat/` — new features
   - `fix/` — bug fixes
   - `adapter/` — new relay adapters
3. Make your changes
4. Ensure `npm test` passes
5. Open a PR against `main`
6. Wait for CI and review

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance
- `adapter:` — relay adapter changes

## Adding adapters

To add support for a new relay (e.g. nostr-rs-relay, khatru):

1. Implement the `RelayAdapter` interface in `src/adapters/types.ts`
2. Create a new adapter file in `src/adapters/`
3. Add integration tests specific to that relay
4. Document any environment variables required

## Related projects

- [relay-panel](https://github.com/bitmacro/relay-panel) — Frontend (BSL)
- [relay-api](https://github.com/bitmacro/relay-api) — Central hub (private)

## What we do NOT accept

- Breaking changes to the REST API without versioning
- Heavy dependencies that bloat the package
- Code without tests
