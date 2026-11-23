import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { realHosts } from "../support/real-host.ts";
import { createWorkspace } from "./ts-workspace.ts";
import { vscode } from "./mock-vscode.ts";
import { fakeDocument } from "./vscode-stub.ts";

const workspace = createWorkspace({
  "motion.ts":
    "export function pageMotion(distance: number): { translate: string } {\n  return { translate: `0px ${distance}px` };\n}\n",
});
afterAll(() => workspace.dispose());

const { LusiaCompletionProvider } = await import("../../src/providers/completion.ts");
const { LusiaHoverProvider } = await import("../../src/providers/hover.ts");
const { LusiaDefinitionProvider } = await import("../../src/providers/definition.ts");
const { LusiaReferenceProvider } = await import("../../src/providers/references.ts");
const { LusiaRenameProvider } = await import("../../src/providers/rename.ts");
const { LusiaSignatureHelpProvider } = await import("../../src/providers/signature.ts");
const { LusiaOnTypeFormattingProvider } = await import("../../src/providers/on-type.ts");
const { LusiaDocumentLinkProvider } = await import("../../src/providers/links.ts");
const { LusiaDocumentSymbolProvider } = await import("../../src/providers/symbols.ts");
const { LusiaFoldingRangeProvider } = await import("../../src/providers/folding.ts");
const { LusiaSelectionRangeProvider } = await import("../../src/providers/selection.ts");
const { LusiaDocumentHighlightProvider } = await import("../../src/providers/highlights.ts");
const { LusiaLinkedEditingProvider } = await import("../../src/providers/linked.ts");
const { LusiaColorProvider } = await import("../../src/providers/colors.ts");
const { LusiaCodeActionProvider } = await import("../../src/providers/code-actions.ts");
const { LusiaDiagnostics } = await import("../../src/diagnostics.ts");

const captured = vscode.__captured;

function component(name: string, text: string) {
  const fileName = workspace.write(name, text);
  return { document: fakeDocument(fileName, text), text, fileName };
}

function offsetAfter(text: string, needle: string): number {
  const index = text.indexOf(needle);
  if (index === -1) throw new Error(`Missing ${JSON.stringify(needle)}`);
  return index + needle.length;
}

const FLOW = `<script>
import { variable } from "lusiajs";
interface Row { label: string; count: number }
const rows = variable<Row[]>([{ label: "a", count: 1 }]);
</script>
<EACH {rows} as={row}>
  <p>{row.}</p>
</EACH>
`;

describe("completion and hover wiring", () => {
  const source = component("Flow.lusia", FLOW);

  test("adds TypeScript members in a flow expression", async () => {
    const offset = offsetAfter(source.text, "{row.");
    const items = await mocked(new LusiaCompletionProvider(realHosts)).provideCompletionItems(
      source.document,
      source.document.positionAt(offset),
    );
    const labels = items.map((item: any) => item.label);
    expect(labels).toContain("label");
    expect(labels).toContain("count");
    const count = items.find((item: any) => item.label === "count");
    expect(count?.kind).toBe(vscode.CompletionItemKind.Property);
  });

  test("resolves a TypeScript auto-import into an additional edit", async () => {
    const source = component("Auto.lusia", `<script>\nconst motion = pageMo\n</script>`);
    const provider = mocked(new LusiaCompletionProvider(realHosts));
    const offset = offsetAfter(source.text, "pageMo");
    const items = await provider.provideCompletionItems(
      source.document,
      source.document.positionAt(offset),
    );
    const auto = items.find((item: any) => item.label === "pageMotion");
    expect(auto).toBeDefined();
    const resolved = provider.resolveCompletionItem(auto);
    expect(String(resolved.detail)).toContain("pageMotion");
    expect(resolved.additionalTextEdits).toHaveLength(1);
    expect(String(resolved.additionalTextEdits[0].newText)).toContain(
      'import { pageMotion } from "./motion"',
    );
  });

  test("resolves a TypeScript completion to its documentation", async () => {
    const offset = offsetAfter(source.text, "{row.");
    const provider = mocked(new LusiaCompletionProvider(realHosts));
    const items = await provider.provideCompletionItems(
      source.document,
      source.document.positionAt(offset),
    );
    const item = items.find((candidate: any) => candidate.label === "count");
    const resolved = provider.resolveCompletionItem(item!);
    expect(resolved.detail).toContain("count");
  });

  test("hovers the variable behind a markup expression", async () => {
    const hover = await mocked(new LusiaHoverProvider(realHosts)).provideHover(
      source.document,
      source.document.positionAt(source.text.indexOf("{rows") + 2),
    );
    expect(String(hover?.contents?.value)).toContain("Variable<Row[]>");
    expect(hover?.range).toBeDefined();
  });
});

const APP = `<script>
import { variable } from "lusiajs";

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const todos = variable<Todo[]>([{ id: 1, title: "Read", done: false }]);
const doneCount = variable.compute(() => todos.value.filter((todo) => todo.done).length);

function toggle(todo: Todo) {
  todo.done = !todo.done;
}
</script>

<EACH {todos} as={todo} key={todo.id}>
  <span>{todo.title}</span>
  <button onchange={() => toggle(todo)}>{todo.done ? "Done" : "Open"}</button>
</EACH>
`;

const EASE_APP = `<script>
import { EASE } from "lusiajs";

const land = { default: [EASE.STYLE.QUART, EASE.OUT] };
</script>
`;

describe("typed hover", () => {
  const source = component("App.lusia", APP);
  const hoverAt = async (offset: number) => {
    const result = await mocked(new LusiaHoverProvider(realHosts)).provideHover(
      source.document,
      source.document.positionAt(offset),
    );
    return String(result?.contents?.value ?? "");
  };

  test("shows the Lusia declaration and summary for an imported API name, not the TypeScript type", async () => {
    const body = await hoverAt(APP.indexOf("import { variable") + "import { ".length + 2);
    expect(body.startsWith("```ts\nvariable<T>(initial: T): Variable<T>\n```")).toBe(true);
    expect(body).toContain("Creates a value that updates the page");
    expect(body).not.toContain("(alias)");
  });

  test("shows only the typed hover for a local variable", async () => {
    const body = await hoverAt(APP.indexOf("EACH {todos") + "EACH {".length + 1);
    expect(body).toContain("Variable<Todo[]>");
    expect(body).not.toContain("Creates a value");
  });

  test("shows the typed flow variable inside EACH", async () => {
    const body = await hoverAt(APP.indexOf("{todo.title}") + 2);
    expect(body).toContain("var todo: Todo");
  });

  test("shows the Lusia declaration first for a dotted name", async () => {
    const body = await hoverAt(APP.indexOf("variable.compute") + "variable.".length + 1);
    expect(body.startsWith("```ts\nvariable.compute<T>(fn: () => T)")).toBe(true);
    expect(body).toContain("Creates a read-only value derived from other variables.");
  });

  test("shows the Lusia reference hover for markup flow tags", async () => {
    const body = await hoverAt(APP.indexOf("<EACH") + 2);
    expect(body.startsWith("```html\n<EACH {list}")).toBe(true);
    expect(body).toContain("Repeats its content once for each item in a list.");
  });

  test("shows the compact EASE declaration and its members table", async () => {
    const easeSource = component("Ease.lusia", EASE_APP);
    const result = await mocked(new LusiaHoverProvider(realHosts)).provideHover(
      easeSource.document,
      easeSource.document.positionAt(EASE_APP.indexOf("EASE.OUT") + 2),
    );
    const body = String(result?.contents?.value ?? "");
    expect(body.startsWith("```ts\nconst EASE: { STYLE, IN, OUT, INOUT }\n```")).toBe(true);
    expect(body).toContain("| `STYLE.QUART` |");
  });

  test("prefers TypeScript completion details and keeps the API docs", async () => {
    const provider = mocked(new LusiaCompletionProvider(realHosts));
    const blank = source.text.indexOf("interface Todo") - 1;
    const items = await provider.provideCompletionItems(
      source.document,
      source.document.positionAt(blank),
    );
    const item = items.find((candidate: any) => candidate.label === "variable");
    expect(item).toBeDefined();
    const resolved = provider.resolveCompletionItem(item);
    expect(String(resolved.detail)).toContain("const variable");
    expect(String(resolved.documentation?.value)).toContain(
      "Creates a value that updates the page",
    );
    expect(String(resolved.documentation?.value)).not.toContain("**variable()**");
  });

  test("keeps the unimported-name completion and its auto-import edit", async () => {
    const text = "<script>\n\n</script>";
    const fileName = workspace.write("Empty.lusia", text);
    const document = fakeDocument(fileName, text);
    const provider = mocked(new LusiaCompletionProvider(realHosts));
    const items = await provider.provideCompletionItems(document, document.positionAt(9));
    const item = items.find((candidate: any) => candidate.label === "variable");
    expect(item?.additionalTextEdits?.[0]?.newText).toContain(
      'import { variable } from "lusiajs";',
    );
    const resolved = provider.resolveCompletionItem(item);
    expect(resolved.additionalTextEdits?.[0]?.newText).toContain(
      'import { variable } from "lusiajs";',
    );
  });
});

const CALLS = `<script>
import { greet } from "./util.ts";
const hello = greet("Ada");
function toggle(value: number): void {}
</script>
<p>{greet("x")}</p>
<p>{toggle(1)}</p>
`;

describe("script navigation wiring", () => {
  workspace.write("util.ts", "export function greet(name: string): string {\n  return name;\n}\n");
  const source = component("Calls.lusia", CALLS);
  const toggleStart = source.text.lastIndexOf("toggle(1)");

  test("helps with signature arguments", async () => {
    const offset = source.text.lastIndexOf("toggle(") + "toggle(".length;
    const help = await mocked(new LusiaSignatureHelpProvider(realHosts)).provideSignatureHelp(
      source.document,
      source.document.positionAt(offset),
    );
    expect(help?.signatures[0]?.label).toContain("toggle(value: number)");
    expect(help?.activeParameter).toBe(0);
  });

  test("defines a markup call in the script", async () => {
    const locations = await mocked(new LusiaDefinitionProvider(realHosts)).provideDefinition(
      source.document,
      source.document.positionAt(toggleStart),
    );
    expect(locations?.[0]?.uri.fsPath).toBe(source.fileName);
    expect(locations?.[0]?.range.start.line).toBe(
      source.text.slice(0, source.text.indexOf("function toggle")).split("\n").length - 1,
    );
  });

  test("finds references across script and markup", async () => {
    const locations = await mocked(new LusiaReferenceProvider(realHosts)).provideReferences(
      source.document,
      source.document.positionAt(source.text.indexOf("greet(")),
      { includeDeclaration: true },
    );
    expect(locations?.length).toBeGreaterThan(1);
    expect(locations?.some((location: any) => location.uri.fsPath === source.fileName)).toBe(true);
    expect(locations?.some((location: any) => location.uri.fsPath.endsWith("util.ts"))).toBe(true);
  });

  test("renames a markup expression into the script", async () => {
    const edit = await mocked(new LusiaRenameProvider(realHosts)).provideRenameEdits(
      source.document,
      source.document.positionAt(offsetAfter(source.text, "<p>{greet")),
      "welcome",
    );
    const changes = edit?.entries().flat() ?? [];
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes.some((change: any) => change.range.start.line === 2)).toBe(true);
    expect(changes.every((change: any) => change.newText === "welcome")).toBe(true);
  });
});

describe("markup wiring", () => {
  const source = component("Markup.lusia", "<div><span>x</span></div>");

  test("closes a tag on typing", async () => {
    const document = fakeDocument(join(workspace.root, "Close.lusia"), "<div>");
    const edits = await mocked(
      new LusiaOnTypeFormattingProvider(realHosts),
    ).provideOnTypeFormattingEdits(document, document.positionAt(5), ">", {});
    expect(edits[0]?.newText).toBe("</div>");
    expect(edits[0]?.range.start.character).toBe(5);
  });

  test("resolves a relative link against the component", async () => {
    const document = fakeDocument(join(workspace.root, "Links.lusia"), `<a href="./page.lusia">`);
    const links = await mocked(new LusiaDocumentLinkProvider(realHosts)).provideDocumentLinks(
      document,
    );
    expect(links[0]?.target.fsPath).toBe(join(workspace.root, "page.lusia"));
    expect(links[0]?.tooltip).toBe(join(workspace.root, "page.lusia"));
  });

  test("renames a plain tag and its close tag", async () => {
    const edit = await mocked(new LusiaRenameProvider(realHosts)).provideRenameEdits(
      source.document,
      source.document.positionAt(2),
      "section",
    );
    expect(edit?.size).toBe(2);
  });

  test("highlights and links the two tag names", async () => {
    const highlights = await mocked(
      new LusiaDocumentHighlightProvider(realHosts),
    ).provideDocumentHighlights(source.document, source.document.positionAt(2));
    expect(highlights?.map((highlight: any) => highlight.kind)).toEqual([
      vscode.DocumentHighlightKind.Read,
      vscode.DocumentHighlightKind.Read,
    ]);
    const linked = await mocked(
      new LusiaLinkedEditingProvider(realHosts),
    ).provideLinkedEditingRanges(source.document, source.document.positionAt(2));
    expect(linked?.ranges).toHaveLength(2);
  });

  test("outlines markup and style symbols", async () => {
    const text = `<div><span>x</span></div>\n<style>\n.a { color: red; }\n</style>`;
    const document = fakeDocument(join(workspace.root, "Outline.lusia"), text);
    const symbols = await mocked(new LusiaDocumentSymbolProvider(realHosts)).provideDocumentSymbols(
      document,
    );
    expect(symbols[0]?.name).toBe("div");
    expect(symbols[0]?.kind).toBe(vscode.SymbolKind.Field);
    expect(symbols.some((symbol: any) => symbol.name === ".a")).toBe(true);
  });

  test("folds elements and sections", async () => {
    const text = `<div>\n<span>x</span>\n</div>\n<script>\nconst x = 1;\n</script>`;
    const document = fakeDocument(join(workspace.root, "Fold.lusia"), text);
    const ranges = await mocked(new LusiaFoldingRangeProvider(realHosts)).provideFoldingRanges(
      document,
    );
    expect(ranges.some((range: any) => range.start === 0 && range.end === 1)).toBe(true);
    expect(ranges.some((range: any) => range.start === 3 && range.end === 4)).toBe(true);
  });

  test("grows the selection from tag name to element", async () => {
    const chains = await mocked(new LusiaSelectionRangeProvider(realHosts)).provideSelectionRanges(
      source.document,
      [source.document.positionAt(2)],
    );
    expect(chains[0]?.range.start.line).toBe(0);
    expect(chains[0]?.parent).toBeDefined();
  });
});

describe("style wiring", () => {
  test("lists scss colors", async () => {
    const document = fakeDocument(
      join(workspace.root, "Colors.lusia"),
      `<style>\n$brand: #ff0000;\n.a { color: $brand; }\n</style>`,
    );
    const colors = await mocked(new LusiaColorProvider(realHosts)).provideDocumentColors(document);
    expect(colors).toHaveLength(1);
    expect(colors[0]?.color).toEqual(new vscode.Color(1, 0, 0, 1));
  });

  test("offers the unknown property code action", async () => {
    const text = `<style>\n.a { colr: red; }\n</style>`;
    const document = fakeDocument(join(workspace.root, "Actions.lusia"), text);
    const actions = await mocked(new LusiaCodeActionProvider(realHosts)).provideCodeActions(
      document,
      new vscode.Range(
        document.positionAt(text.indexOf("colr")),
        document.positionAt(text.indexOf("colr") + 4),
      ),
      { diagnostics: [] },
    );
    const rename = actions.find((action: any) => action.title === "Rename to 'color'");
    expect(rename?.edit?.size).toBe(1);
  });
});

describe("diagnostic wiring", () => {
  const FILE = `<script>\nconst total: number = "three";\n</script>\n<div><span></div>\n<style>\n.a { colr: red; }\n</style>\n`;
  const source = component("Broken.lusia", FILE);
  const diagnostics = new LusiaDiagnostics(realHosts);
  afterAll(() => diagnostics.dispose());

  test("fills one collection per source", async () => {
    diagnostics.schedule(source.document);
    const ready = await waitFor(
      () =>
        count("typescript", source.document) > 0 &&
        count("html", source.document) > 0 &&
        count("css", source.document) > 0,
    );
    expect(ready).toBe(true);
    for (const name of ["typescript", "html", "css"] as const) {
      const found = captured.collections[name]?.get(source.document.uri) ?? [];
      expect(found.length).toBeGreaterThan(0);
      expect(found.every((item) => item.source === name)).toBe(true);
    }
    diagnostics.clear(source.document);
    expect(captured.collections.typescript?.get(source.document.uri)).toBeUndefined();
  }, 15000);

  test("turns a lint finding with a fix into a code action", async () => {
    const lint = component(
      "Lint.lusia",
      `<script>\nimport Badge from "./Badge.lusia";\nconst value = 1;\n</script>\n<p>{value}</p>\n`,
    );
    diagnostics.schedule(lint.document);
    const ready = await waitFor(() => count("lusia-lint", lint.document) > 0);
    expect(ready).toBe(true);
    const issues = captured.collections["lusia-lint"]?.get(lint.document.uri) ?? [];
    const diagnostic = issues[0]!;
    const actions = await mocked(new LusiaCodeActionProvider(realHosts)).provideCodeActions(
      lint.document,
      diagnostic.range,
      { diagnostics: issues },
    );
    expect(actions[0]?.title.startsWith("Fix: ")).toBe(true);
    expect(actions[0]?.edit?.size).toBe(1);
    diagnostics.clear(lint.document);
  }, 15000);
});

async function waitFor(condition: () => boolean, timeout = 15000): Promise<boolean> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}

function mocked<T>(provider: T): any {
  return provider;
}

function count(name: string, document: ReturnType<typeof fakeDocument>): number {
  return captured.collections[name]?.get(document.uri)?.length ?? 0;
}
