# Lusia for VS Code

Editor support for `.lusia` components.

## Features

| Feature          | What it does                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Highlighting     | Script as TypeScript, styles as SCSS or CSS, markup as HTML, `{expr}` as TypeScript                                                                    |
| Completion       | Type-aware members in script and `{expr}`, Lusia API names with a details panel, `.ts` imports, missing imports added for you, markup and style        |
| Hover            | TypeScript types, API docs, dotted names, `.ts` JSDoc, components, markup and style                                                                    |
| Errors           | Compile errors, TypeScript errors, HTML validation and CSS/SCSS validation, each with its own source                                                   |
| Warnings         | Lint rules, shown with source `lusia-lint`; a finding with a fix offers a quick fix                                                                    |
| Go to definition | Markup tags to their component, TypeScript names, and SCSS variables or mixins across files                                                            |
| References       | TypeScript and SCSS names, across files where they are imported                                                                                        |
| Rename           | TypeScript names, plain HTML tags with their close tag, and SCSS members across files                                                                  |
| Signature help   | TypeScript calls, with the parameter documentation                                                                                                     |
| Auto-close       | The closing tag right after typing `>` of a plain HTML start tag                                                                                       |
| Links            | `href`/`src` paths and SCSS `@use`/`@import` paths, resolved against the component file                                                                |
| Outline          | Markup elements and style symbols, with folds for both and for `script`/`style` sections                                                               |
| Colors           | SCSS and CSS colours, with the colour picker and its presentations                                                                                     |
| Code actions     | SCSS/CSS fixes and lint quick fixes                                                                                                                    |
| Format           | Script as TypeScript, styles as SCSS or CSS, markup as HTML, with the project's Prettier config and your VS Code indent. Flow tags are kept as written |
| Snippets         | Component, props, child component, scoped style, `IF`, `EACH`, `FOR`, click handler, two-way input                                                     |

Formatting reads the project's Prettier config (`.prettierrc`, `prettier.config.js`, or `.editorconfig`), and uses the VS Code indent setting when the config does not set `tabWidth` or `useTabs`.

TypeScript features use the workspace's own TypeScript when it has one, and the copy bundled with the extension otherwise. A completion for a project symbol that is not imported yet adds its import when you accept it. Script sections and `{expr}` markup expressions are checked together, so a member completion or a rename also covers names that only appear in the markup. The completion details panel shows the signature, summary, bullets and example from `reference/api.ts`; a name from TypeScript shows its signature and JSDoc.

HTML validation keeps Lusia markup legal: components, flow tags, `{expr}` values and `@scoped` style are not reported. Style checks understand `@use`/`@import` from other SCSS files, so cross-file variables and mixins complete, hover, define and rename.

See the site Guide (https://azpepoze.github.io/lusia/guide) for the lint rules and `reference/api.ts` for the API table.

## Install

Build the extension, then install the `.vsix` file.

1. From the repo root, run `bun install`.
2. In `editors/vscode`, run `bun install` and `bun run package`.
3. In VS Code, open the Extensions view, then `...`, then **Install from VSIX...**.
4. Pick the `lusia-vscode-0.2.0.vsix` file.

## Develop

Build the bundle, then link the folder into VS Code.

```sh
cd editors/vscode
bun install
bun run build
ln -s "$PWD" ~/.vscode/extensions/lusia.lusia-vscode-0.2.0
```

Run **Developer: Reload Window** in VS Code after each build.

> [!NOTE]
> The build bundles the compiler from `src/compiler`, so the repo root must be installed first.

> [!TIP]
> If a colour looks wrong, run **Developer: Inspect Editor Tokens and Scopes** on it. It shows the scope VS Code assigned.
