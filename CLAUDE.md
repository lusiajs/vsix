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

Use Conventional Commits, one commit per logical change. Use full plain names and write no comment bloat. Before committing, look for the issue the change belongs to and reference it: `refs #N`, or `fixes #N` when the commit finishes it.

# 8. Update workflow opens a PR

`update-framework.yml` opens a PR when `lusiajs` changes. Releases stay manual: a human merges the PR, bumps the version and pushes the tag.

# 9. Indent script and style

Indent the code inside `<script>` and `<style>` of a `.lusia` file by 2 spaces, in source files, templates and every example. The framework allows flush-left code, but this is the house style. Full example: `docs/CLAUDE.md` rule 11.

# 10. Branches

Work from `main`. Only `main` and `dev` stay long-lived. Delete a branch once it is merged.

# 11. Worktrees

Worktrees go in `.worktrees/` inside this repo (gitignored): `git worktree add .worktrees/<name> -b <branch> dev`. Never put them next to the repo or in `/tmp`.

# 12. Reuse before writing

Before writing logic, search the repo for code that already does the same job (a check, a cache, a parser, a helper). Reuse or extend it. When two places need the same thing, make one shared helper or base interface and have both use it. Never write a second version. Every agent spec includes this check.
