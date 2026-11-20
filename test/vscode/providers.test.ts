import { afterAll, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";
import { createWorkspace } from "./ts-workspace.ts";
import { createVscode, fakeDocument } from "./vscode-stub.ts";

const vscode = createVscode();
mock.module("vscode", () => vscode);

const workspace = createWorkspace();
afterAll(() => workspace.dispose());

const { LusiaCompletionProvider } =
  await import("../../../editors/vscode/src/providers/completion.ts");
const { LusiaHoverProvider } = await import("../../../editors/vscode/src/providers/hover.ts");
const { LusiaDefinitionProvider } =
  await import("../../../editors/vscode/src/providers/definition.ts");
const { LusiaReferenceProvider } =
  await import("../../../editors/vscode/src/providers/references.ts");
const { LusiaRenameProvider } = await import("../../../editors/vscode/src/providers/rename.ts");
const { LusiaSignatureHelpProvider } =
  await import("../../../editors/vscode/src/providers/signature.ts");
const { LusiaOnTypeFormattingProvider } =
  await import("../../../editors/vscode/src/providers/on-type.ts");
const { LusiaDocumentLinkProvider } =
  await import("../../../editors/vscode/src/providers/links.ts");
const { LusiaDocumentSymbolProvider } =
  await import("../../../editors/vscode/src/providers/symbols.ts");
const { LusiaFoldingRangeProvider } =
  await import("../../../editors/vscode/src/providers/folding.ts");
const { LusiaSelectionRangeProvider } =
  await import("../../../editors/vscode/src/providers/selection.ts");
const { LusiaDocumentHighlightProvider } =
  await import("../../../editors/vscode/src/providers/highlights.ts");
const { LusiaLinkedEditingProvider } =
  await import("../../../editors/vscode/src/providers/linked.ts");
const { LusiaColorProvider } = await import("../../../editors/vscode/src/providers/colors.ts");
const { LusiaCodeActionProvider } =
  await import("../../../editors/vscode/src/providers/code-actions.ts");
const { LusiaDiagnostics } = await import("../../../editors/vscode/src/diagnostics.ts");

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
import { variable } from "lusia";
interface Row { label: string; count: number }
const rows = variable<Row[]>([{ label: "a", count: 1 }]);
</script>
<EACH {rows} as={row}>
  <p>{row.}</p>
</EACH>
`;

describe("completion and hover wiring", () => {
  const source = component("Flow.lusia", FLOW);

  test("adds TypeScript members in a flow expression", () => {
    const offset = offsetAfter(source.text, "{row.");
    const items = mocked(new LusiaCompletionProvider()).provideCompletionItems(
      source.document,
      source.document.positionAt(offset),
    );
    const labels = items.map((item: any) => item.label);
    expect(labels).toContain("label");
    expect(labels).toContain("count");
    const count = items.find((item: any) => item.label === "count");
    expect(count?.kind).toBe(vscode.CompletionItemKind.Property);
  });

  test("resolves a TypeScript completion to its documentation", () => {
    const offset = offsetAfter(source.text, "{row.");
    const provider = mocked(new LusiaCompletionProvider());
    const item = provider
      .provideCompletionItems(source.document, source.document.positionAt(offset))
      .find((candidate: any) => candidate.label === "count");
    const resolved = provider.resolveCompletionItem(item!);
    expect(resolved.detail).toContain("count");
  });

  test("hovers the variable behind a markup expression", () => {
    const hover = mocked(new LusiaHoverProvider()).provideHover(
      source.document,
      source.document.positionAt(source.text.indexOf("{rows") + 2),
    );
    expect(String(hover?.contents?.value)).toContain("Variable<Row[]>");
    expect(hover?.range).toBeDefined();
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

  test("helps with signature arguments", () => {
    const offset = source.text.lastIndexOf("toggle(") + "toggle(".length;
    const help = mocked(new LusiaSignatureHelpProvider()).provideSignatureHelp(
      source.document,
      source.document.positionAt(offset),
    );
    expect(help?.signatures[0]?.label).toContain("toggle(value: number)");
    expect(help?.activeParameter).toBe(0);
  });

  test("defines a markup call in the script", () => {
    const locations = mocked(new LusiaDefinitionProvider()).provideDefinition(
      source.document,
      source.document.positionAt(toggleStart),
    );
    expect(locations?.[0]?.uri.fsPath).toBe(source.fileName);
    expect(locations?.[0]?.range.start.line).toBe(
      source.text.slice(0, source.text.indexOf("function toggle")).split("\n").length - 1,
    );
  });

  test("finds references across script and markup", () => {
    const locations = mocked(new LusiaReferenceProvider()).provideReferences(
      source.document,
      source.document.positionAt(source.text.indexOf("greet(")),
      { includeDeclaration: true },
    );
    expect(locations?.length).toBeGreaterThan(1);
    expect(locations?.some((location: any) => location.uri.fsPath === source.fileName)).toBe(true);
    expect(locations?.some((location: any) => location.uri.fsPath.endsWith("util.ts"))).toBe(true);
  });

  test("renames a markup expression into the script", () => {
    const edit = mocked(new LusiaRenameProvider()).provideRenameEdits(
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

  test("closes a tag on typing", () => {
    const document = fakeDocument(join(workspace.root, "Close.lusia"), "<div>");
    const edits = mocked(new LusiaOnTypeFormattingProvider()).provideOnTypeFormattingEdits(
      document,
      document.positionAt(5),
      ">",
      {},
    );
    expect(edits[0]?.newText).toBe("</div>");
    expect(edits[0]?.range.start.character).toBe(5);
  });

  test("resolves a relative link against the component", () => {
    const document = fakeDocument(join(workspace.root, "Links.lusia"), `<a href="./page.lusia">`);
    const links = mocked(new LusiaDocumentLinkProvider()).provideDocumentLinks(document);
    expect(links[0]?.target.fsPath).toBe(join(workspace.root, "page.lusia"));
    expect(links[0]?.tooltip).toBe(join(workspace.root, "page.lusia"));
  });

  test("renames a plain tag and its close tag", () => {
    const edit = mocked(new LusiaRenameProvider()).provideRenameEdits(
      source.document,
      source.document.positionAt(2),
      "section",
    );
    expect(edit?.size).toBe(2);
  });

  test("highlights and links the two tag names", () => {
    const highlights = mocked(new LusiaDocumentHighlightProvider()).provideDocumentHighlights(
      source.document,
      source.document.positionAt(2),
    );
    expect(highlights?.map((highlight: any) => highlight.kind)).toEqual([
      vscode.DocumentHighlightKind.Read,
      vscode.DocumentHighlightKind.Read,
    ]);
    const linked = mocked(new LusiaLinkedEditingProvider()).provideLinkedEditingRanges(
      source.document,
      source.document.positionAt(2),
    );
    expect(linked?.ranges).toHaveLength(2);
  });

  test("outlines markup and style symbols", () => {
    const text = `<div><span>x</span></div>\n<style>\n.a { color: red; }\n</style>`;
    const document = fakeDocument(join(workspace.root, "Outline.lusia"), text);
    const symbols = mocked(new LusiaDocumentSymbolProvider()).provideDocumentSymbols(document);
    expect(symbols[0]?.name).toBe("div");
    expect(symbols[0]?.kind).toBe(vscode.SymbolKind.Field);
    expect(symbols.some((symbol: any) => symbol.name === ".a")).toBe(true);
  });

  test("folds elements and sections", () => {
    const text = `<div>\n<span>x</span>\n</div>\n<script>\nconst x = 1;\n</script>`;
    const document = fakeDocument(join(workspace.root, "Fold.lusia"), text);
    const ranges = mocked(new LusiaFoldingRangeProvider()).provideFoldingRanges(document);
    expect(ranges.some((range: any) => range.start === 0 && range.end === 1)).toBe(true);
    expect(ranges.some((range: any) => range.start === 3 && range.end === 4)).toBe(true);
  });

  test("grows the selection from tag name to element", () => {
    const chains = mocked(new LusiaSelectionRangeProvider()).provideSelectionRanges(
      source.document,
      [source.document.positionAt(2)],
    );
    expect(chains[0]?.range.start.line).toBe(0);
    expect(chains[0]?.parent).toBeDefined();
  });
});

describe("style wiring", () => {
  test("lists scss colors", () => {
    const document = fakeDocument(
      join(workspace.root, "Colors.lusia"),
      `<style>\n$brand: #ff0000;\n.a { color: $brand; }\n</style>`,
    );
    const colors = mocked(new LusiaColorProvider()).provideDocumentColors(document);
    expect(colors).toHaveLength(1);
    expect(colors[0]?.color).toEqual(new vscode.Color(1, 0, 0, 1));
  });

  test("offers the unknown property code action", () => {
    const text = `<style>\n.a { colr: red; }\n</style>`;
    const document = fakeDocument(join(workspace.root, "Actions.lusia"), text);
    const actions = mocked(new LusiaCodeActionProvider()).provideCodeActions(
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
  const diagnostics = new LusiaDiagnostics();
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
    const actions = mocked(new LusiaCodeActionProvider()).provideCodeActions(
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
