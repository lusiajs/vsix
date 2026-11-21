# CLAUDE.md

This repo is the VS Code extension (`.vsix`) for `.lusia` files. It is published to the VS Code Marketplace (publisher `lusia`) and as a GitHub release.

# 1. Depends on the lusiajs package
The extension uses the published `lusiajs` package: `lusiajs/api` (API table), `lusiajs/language/*` (parse, format, lint), `lusiajs/editor/*` (completion and hover logic) and `lusiajs/compiler`.

# 2. Follow lusia changes
A `.lusia` syntax or API change in lusia must be followed here after the lusia release: grammar, completion, hover, lint and formatter. Then bump `lusiajs` in `package.json`.

# 3. CSS generator lives in lusia
The CSS property generator is in the lusia repo (`scripts/css-properties.ts`), not here.

# 4. Grammar never shows plain text
`syntaxes/lusia.tmLanguage.json` must never show valid `.lusia` syntax as plain text.

# 5. Release by tag
Push a tag equal to the package version, such as `v0.1.0`. `release.yml` publishes to the Marketplace with `VSCE_PAT` and creates the GitHub release.

# 5a. Version follows lusia
The extension version has the same `major.minor` as the lusia version it supports, and its own `patch`. Lusia `0.1.x` goes with extension `0.1.x`; lusia `0.2.x` goes with extension `0.2.0`. Every extension release, also one with no lusia change, bumps the patch: `0.1.0`, `0.1.1`, `0.1.2`. Never drop below the current patch when lusia moves to a new `major.minor`.

The version must be plain `major.minor.patch`. The Marketplace and `vsce` reject a fourth number such as `0.1.0.1` (checked), and the Marketplace does not take pre-release suffixes such as `-beta.1`. A lusia beta (`0.1.0-beta.1`) therefore pairs with extension `0.1.x`. Say the supported lusia range in the README. Keep the `lusiajs` dependency in `package.json` on that range.

# 6. Checks
Run `bun run typecheck`, `bun run test` and `bun run build` before a commit.

# 7. Commits and code
Use Conventional Commits, one commit per logical change. Use full plain names and write no comment bloat.
