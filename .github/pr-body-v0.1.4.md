## What this PR does

Fixes `--version` returning `0.0.0` when run via npx. The npx runs the bin via symlink in `node_modules/.bin/`, so `process.argv[1]` pointed to the symlink. Using `realpathSync` resolves to the actual .mjs path.

## Type of change
- [x] Bug fix

## Tested with
- strfry version: N/A (CLI-only)
- Node version: 20
- OS: Windows

## Checklist
- [x] `npm test` passes locally
- [x] No breaking changes to existing REST endpoints
- [ ] New code has tests
- [x] CHANGELOG.md updated
- [x] Documentation updated (README)
