# LuciaJS for VS Code

Editor support for `.lucia` components.

## Features

| Feature | What it does |
|---|---|
| Highlighting | Script as TypeScript, styles as SCSS or CSS, markup as HTML, `{expr}` as TypeScript |
| Completion | Lucia API names, component tags, child props, style keywords, flow tags, events and `bind` |
| Hover | API docs for names, style keywords, flow tags, events, `bind` and component tags (with props) |
| Errors | Compile errors from the Lucia compiler, on open and on change |
| Warnings | Lint rules, shown with source `lucia-lint` |
| Go to definition | Component tag to its `.lucia` file |
| Format | Script as TypeScript, styles as SCSS or CSS, markup as HTML. Flow tags are kept as written |
| Snippets | Component, props, child component, scoped style, `IF`, `EACH`, `FOR`, click handler, two-way input |

See `docs/editor.md` in the LuciaJS repo for the lint rules and the API table.

## Install

Build the extension, then install the `.vsix` file.

1. From the repo root, run `bun install`.
2. In `editors/vscode`, run `bun install` and `bun run package`.
3. In VS Code, open the Extensions view, then `...`, then **Install from VSIX...**.
4. Pick the `lucia-vscode-0.2.0.vsix` file.

## Develop

Build the bundle, then link the folder into VS Code.

```sh
cd editors/vscode
bun install
bun run build
ln -s "$PWD" ~/.vscode/extensions/lucia.lucia-vscode-0.2.0
```

Run **Developer: Reload Window** in VS Code after each build.

> [!NOTE]
> The build bundles the compiler from `src/compiler`, so the repo root must be installed first.

> [!TIP]
> If a colour looks wrong, run **Developer: Inspect Editor Tokens and Scopes** on it. It shows the scope VS Code assigned.
