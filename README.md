<p align="center"><img src="https://raw.githubusercontent.com/lusiajs/lusia/main/logo/logo-animated.svg" width="96" alt="Lusia logo"></p>

# Lusia for VS Code

Editor support for `.lusia` components: colors, completion, errors and formatting.

Works with `lusiajs` 0.1.1-beta and `@lusiajs/vscode-support` 0.1.2-beta, and later 0.1 versions.
## Features

| Feature               | What you get                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Highlighting          | Script, styles, markup and `{expr}` in their own colors. Components, flow tags and events are colored from the project's tools when they support it |
| Completion            | Lusia and TypeScript names, tags, paths and snippets                                                                                                |
| Hover                 | For Lusia names: the declaration, what it is, an example and a table of values. For TypeScript names: types                                         |
| Errors and warnings   | Compile, type and lint problems, with quick fixes                                                                                                   |
| Go to definition      | Components, TypeScript names, SCSS variables and mixins                                                                                             |
| Rename and references | TypeScript and SCSS names across files                                                                                                              |
| Format                | Script, styles and markup, using your Prettier config                                                                                               |
| Snippets              | Component, `IF`, `EACH`, `FOR` and click handler                                                                                                    |

## Setup

The language features come from the project's own VS Code support package. Install it in your project:

```sh
bun add -d lusiajs @lusiajs/vscode-support
```

> [!IMPORTANT]
> Without the tools, every Lusia-aware feature is off: completion, hover, errors, colors, format and navigation. Syntax highlighting still works.

| Message                                | What to do                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lusia is not installed in this project | Run the install command above                                                                              |
| Lusia VS Code support is not installed | Run `bun add -d @lusiajs/vscode-support@<lusiajs version>`                                                 |
| has no `vscode` entry                  | Update the package: `bun update @lusiajs/vscode-support` |
| uses editor API N                      | Update the extension, or update the tools                                                                  |
| failed to load                         | Read the error in the Lusia output, then run `bun install`                                                 |
| Trust this folder                      | Trust the folder, so Lusia can run the project's tools                                                     |
| does not match lusiajs                 | Install the same version of both packages                                                                  |

The Lusia output (View, then Output, then Lusia) lists the path that loaded, the versions, and every path searched. Run **Lusia: Reload language host** after you install or update the tools.
