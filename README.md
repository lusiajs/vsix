<p align="center"><img src="https://raw.githubusercontent.com/lusiajs/lusia/main/logo/logo-128.png" width="96" alt="Lusia logo"></p>

# Lusia for VS Code

Editor support for `.lusia` components.

## Versions

| Extension | Works with lusia |
| --------- | ---------------- |
| `0.1.x` | `0.1.x` (including `0.1.0-beta.1`) |

The extension version has the same `major.minor` as the lusia version it supports. Its patch number grows with every extension release.

## Features

| Feature | What it does |
| ------- | ------------ |
| Highlighting | Script as TypeScript, styles as SCSS or CSS, markup as HTML, `{expr}` as TypeScript |
| Completion | Type-aware members, Lusia API names with a details panel, `.ts` imports (added when you accept), markup and styles |
| Hover | TypeScript types, Lusia API docs, components, markup and styles |
| Errors | Compile, TypeScript, HTML and CSS/SCSS errors, each shown with its own source |
| Warnings | Lint rules, shown with source `lusia-lint`. A finding with a fix offers a quick fix |
| Go to definition | Markup tags to their component, TypeScript names, SCSS variables and mixins across files |
| References and rename | TypeScript names, plain HTML tags with their close tag, and SCSS names across files |
| Signature help | TypeScript calls, with parameter docs |
| Auto-close | Adds the closing tag after you type `>` on a plain HTML start tag |
| Links | `href` and `src` paths, and SCSS `@use` and `@import` paths |
| Outline | Markup elements and style symbols, with folds for them and for `script` and `style` |
| Colors | SCSS and CSS colours, with the colour picker |
| Code actions | SCSS and CSS fixes, and lint quick fixes |
| Format | Script, styles and markup, with the project's Prettier config. Flow tags stay as written |
| Snippets | Component, props, child component, scoped style, `IF`, `EACH`, `FOR`, click handler and two-way input |

Formatting reads the project's Prettier config (`.prettierrc` or `prettier.config.js`). The VS Code indent setting fills in `tabWidth` and `useTabs` when the config does not set them. Code inside `<script>` and `<style>` is indented one level; `lusia format` turns this off with `format.indentScriptAndStyle: false` in `lusia.config`.

Script sections and `{expr}` values are checked together. So a completion or rename also covers names that appear only in markup.

Lusia names show their API docs in completion and hover. Names from TypeScript show their signature and JSDoc.

## Install

Build the extension from a clone of this repo, then install the `.vsix` file.

1. Run `bun install`.
2. Run `bun run package`. It builds `lusia-vscode-0.1.0.vsix`.
3. In VS Code, open the Extensions view, then `...`, then **Install from VSIX...**.
4. Pick `lusia-vscode-0.1.0.vsix`.

> [!TIP]
> If a colour looks wrong, run **Developer: Inspect Editor Tokens and Scopes** on it. It shows the scope VS Code assigned.

## Develop

| Command | What it does |
| ------- | ------------ |
| `bun install` | Install dependencies, including the `lusiajs` package |
| `bun run typecheck` | Check the types |
| `bun test` | Run the tests |
| `bun run build` | Build `dist/extension.js` |
| `bun run package` | Build and make the `.vsix` file |

The extension uses the published [`lusiajs`](https://www.npmjs.com/package/lusiajs) package for the compiler, parser and API data.
