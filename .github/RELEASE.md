# Release process

## Publishing to npm

Releases are triggered by pushing a version tag (e.g. `v0.1.1`). The [Publish to npm](.github/workflows/publish.yml) workflow runs on tag push.

### NPM_TOKEN requirement

The workflow uses the `NPM_TOKEN` GitHub secret. The token **must** support publishing with 2FA enabled:

- **Classic token:** Create at [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens) with "Automation" or "Publish" scope, and enable **"Bypass two-factor authentication"** at creation time.
- **Granular token:** Use "Packages and scopes" → "Read and write" for `@bitmacro/*`, with **"Bypass two-factor authentication"** enabled at creation time.

If the package has "Require two-factor authentication and disallow tokens" enabled, you must either disable that or use a token with 2FA bypass.

### Steps

1. Merge release PR to `main`
2. Create and push the tag:
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
3. The workflow publishes to npm and creates provenance
