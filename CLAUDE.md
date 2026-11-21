# CLAUDE.md

This repo is the VS Code extension (`.vsix`) for `.lusia` files. It is published to the VS Code Marketplace (publisher `lusia`) and as a GitHub release.

# 1. Depends on the lusia package
The extension uses the published `lusia` package: `lusia/api` (API table), `lusia/language/*` (parse, format, lint), `lusia/editor/*` (completion and hover logic) and `lusia/compiler`.

# 2. Follow lusia changes
A `.lusia` syntax or API change in lusia must be followed here after the lusia release: grammar, completion, hover, lint and formatter. Then bump `lusia` in `package.json`.

# 3. CSS generator lives in lusia
The CSS property generator is in the lusia repo (`scripts/css-properties.ts`), not here.

# 4. Grammar never shows plain text
`syntaxes/lusia.tmLanguage.json` must never show valid `.lusia` syntax as plain text.

# 5. Release by tag
Push a tag equal to the package version, such as `v0.2.0`. `release.yml` publishes to the Marketplace with `VSCE_PAT` and creates the GitHub release. The version must be plain `major.minor.patch` for the Marketplace.

# 6. Checks
Run `bun run typecheck`, `bun run test` and `bun run build` before a commit.

# 7. Commits and code
Use Conventional Commits, one commit per logical change. Use full plain names and write no comment bloat.
