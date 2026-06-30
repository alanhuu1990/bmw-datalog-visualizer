# Changelog update (csv-visualizer)

Use when releasing a new version or when the user asks to update CHANGELOG and bump version.

## Version policy (semver)

| Bump | When |
|------|------|
| **Major** (`X.0.0`) | Breaking changes: removed routes, incompatible settings schema, parser format breaks |
| **Minor** (`0.X.0`) | New features or meaningful enhancements (non-breaking) |
| **Patch** (`0.0.X`) | Bug fixes only, no new user-facing capability |

Pre-1.0: stay on `0.x.y` until a stable 1.0.0.

## Release workflow

1. **Draft under `[Unreleased]`** in [`CHANGELOG.md`](../../CHANGELOG.md) using Keep a Changelog sections: `Added`, `Changed`, `Fixed`, `Removed`.
2. **Cut a release section** — move `[Unreleased]` bullets into:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD
   ```
3. **Bump version** in [`package.json`](../../package.json) to match the new section.
4. **Refresh lockfile**: run `npm install` from repo root (updates root version in `package-lock.json`).
5. **Verify**: `npm run build` and open `/changelog` in dev — latest release should highlight and show `vX.Y.Z`.

## In-app display

- [`src/lib/changelog.js`](../../src/lib/changelog.js) imports `CHANGELOG.md?raw` at build time — **do not duplicate** release notes in JSX.
- Current version on the changelog page comes from `package.json`; keep both in sync.

## Examples

**Minor feature release (0.4.0 → 0.5.0):**
- Add bullets under `[Unreleased]`
- Create `## [0.5.0] - 2026-07-01` with those bullets
- Set `"version": "0.5.0"` in package.json

**Bug fix (0.5.0 → 0.5.1):**
- Same flow with patch bump under `### Fixed`

**Breaking change (0.5.1 → 1.0.0):**
- Document breaking items under `### Changed` or `### Removed`
- Major bump to `1.0.0`
