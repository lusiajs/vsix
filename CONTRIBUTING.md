# Contributing to Lusia for VS Code

Thanks for helping. Read the rules, set up, then open a pull request.

## Repo layout

| Path | What it holds |
| ---- | ------------- |
| `src/extension.ts` | Entry point. Registers the VS Code providers |
| `src/providers/` | One file per VS Code feature: completion, hover, definition and so on |
| `src/logic/` | Language logic for HTML, CSS/SCSS and `.lusia` files |
| `syntaxes/lusia.tmLanguage.json` | The grammar for highlighting |
| `snippets/`, `icons/`, `language-configuration.json` | Snippets, file icons and editor settings |
| `test/` | Tests. `vscode/` and `logic/` mirror `src/` |

## Other repos

| Repo | Role |
| ---- | ---- |
| [lusiajs/lusia](https://github.com/lusiajs/lusia) | The framework. The extension uses its `lusiajs` package |
| [lusiajs/create](https://github.com/lusiajs/create) | The app starter |
| [lusiajs/docs](https://github.com/lusiajs/docs) | The docs site |

The extension uses the published `lusiajs` package for the API table, the parser, the linter, the formatter, the editor logic and the compiler.

## Rules

- The grammar must never show valid `.lusia` syntax as plain text.
- After a Lusia release, follow its syntax or API change here: grammar, completion, hover, lint and formatter. Then bump `lusiajs` in `package.json`.
- The CSS property generator lives in the lusia repo, not here.
- Versions: the extension has the same `major.minor` as the Lusia it supports, and its own patch number.
  - Lusia `0.1.x` goes with extension `0.1.x`.
  - Every extension release bumps the patch: `0.1.0`, `0.1.1`.
  - Use only `major.minor.patch`. The Marketplace rejects a fourth number and pre-release tags such as `-beta.1`.
- Use full, plain names in code. Keep comments to a minimum.

## Set up

1. Install packages:

   ```sh
   bun install
   ```

2. Check your change:

   | Command | What it does |
   | ------- | ------------ |
   | `bun run typecheck` | Check the types |
   | `bun run test` | Run the tests |
   | `bun run build` | Build `dist/extension.js` |
   | `bun run package` | Build the `.vsix` file |

## Open a pull request

1. Branch from `main`.
2. Keep one logical change per pull request.
3. Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages, such as `feat(completion): ...`.
4. Run typecheck, tests and build. CI runs them too.
5. Open the pull request into `main`. Say what changed and how you checked it.

## Updating lusiajs

A workflow checks for a new `lusiajs` version every 6 hours. When one is out, it opens a pull request that updates `bun.lock`.

| Result | Pull request |
| ------ | ------------ |
| Typecheck, tests and build pass | Ready for review |
| Any check fails | Draft, with the failing check named |

The workflow needs the repository setting **Allow GitHub Actions to create and approve pull requests** (Settings > Actions > General).

A person merges that pull request, bumps the version and pushes the tag. Releases are manual.

## Release notes

Each tag creates a [GitHub release](https://github.com/lusiajs/vsix/releases) with generated notes.
