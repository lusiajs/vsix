import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cssCodeActions,
  cssColorPresentations,
  cssColors,
  cssCompletions,
  cssDefinitions,
  cssDiagnostics,
  cssFolding,
  cssHighlights,
  cssHover,
  cssLinks,
  cssReferences,
  cssRename,
  cssRenameRange,
  cssSelection,
  cssSymbols,
} from "../../src/logic/css.ts";

const directory = mkdtempSync(join(tmpdir(), "lusia-css-"));
const component = join(directory, "Demo.lusia");
const tokens = join(directory, "_tokens.scss");
const palette = join(directory, "_palette.scss");
const all = join(directory, "_all.scss");

writeFileSync(tokens, "$brand: #ff0000;\n@mixin row($gap: 1px) { display: flex; }\n");
writeFileSync(palette, "$ink: #111111;\n");
writeFileSync(all, '@import "palette";\n@import "tokens";\n');

afterAll(() => rmSync(directory, { recursive: true, force: true }));

/** A style block with the given content. */
function style(content: string): string {
  return `<style>\n${content}\n</style>`;
}

/** The source without its `|` cursor marker, plus the offset that marker had. */
function marked(source: string): { text: string; offset: number } {
  const offset = source.indexOf("|");
  return { text: source.slice(0, offset) + source.slice(offset + 1), offset };
}

describe("css diagnostics", () => {
  test("reports an unknown property with a shifted range", () => {
    const text = style(".a { colr: red; }");
    const diagnostics = cssDiagnostics(text);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("unknownProperties");
    expect(diagnostics[0]?.message).toContain("colr");
    const start = text.indexOf("colr");
    expect(diagnostics[0]?.range).toEqual({ start, end: start + 4 });
  });

  test("reports a syntax error with an error severity", () => {
    const diagnostics = cssDiagnostics(style(".a { color: }"));
    expect(diagnostics.some((item) => item.severity === "error")).toBe(true);
  });

  test("reports nothing for valid style content", () => {
    expect(cssDiagnostics(style(".a { color: red; }"))).toEqual([]);
  });

  test("ignores @scoped and @global but keeps other unknown at rules", () => {
    const scoped = style("@scoped {\n  .a { color: red; }\n}");
    const global = style("@global {\n  .a { color: red; }\n}");
    expect(cssDiagnostics(scoped)).toEqual([]);
    expect(cssDiagnostics(global)).toEqual([]);
    expect(cssDiagnostics(style("@tailwind base;"))).toHaveLength(1);
  });

  test("reports nothing outside a style block", () => {
    expect(cssDiagnostics("<p>colr: red;</p>")).toEqual([]);
  });
});

describe("css navigation in a style block", () => {
  const text = style("$brand: #00ff00;\n.a {\n  color: $brand;\n}");
  const use = text.indexOf("$brand", text.indexOf("$brand") + 1);

  test("defines and references a local variable", () => {
    const definitions = cssDefinitions(text, use);
    const definition = definitions[0];
    expect(definition?.range.start).toBe(text.indexOf("$brand"));
    expect(text.slice(definition?.range.start, definition?.range.end)).toContain("$brand");
    const references = cssReferences(text, use).map((item) => item.range.start);
    expect(references).toContain(text.indexOf("$brand"));
    expect(references).toContain(use);
  });

  test("highlights every use of the variable", () => {
    const highlights = cssHighlights(text, use).map((range) => range.start);
    expect(highlights).toContain(text.indexOf("$brand"));
    expect(highlights).toContain(use);
  });

  test("renames a local variable without dropping the dollar", () => {
    const files = cssRename(text, use, "accent") ?? [];
    expect(files).toHaveLength(1);
    const edits = files[0]?.edits ?? [];
    expect(edits.map((edit) => edit.newText)).toEqual(["$accent", "$accent"]);
    expect(edits.map((edit) => edit.range.start)).toEqual([text.indexOf("$brand"), use]);
  });

  test("returns nothing outside a style block", () => {
    expect(cssDefinitions("<p>$brand</p>", 4)).toEqual([]);
    expect(cssReferences("<p>$brand</p>", 4)).toEqual([]);
    expect(cssHighlights("<p>$brand</p>", 4)).toEqual([]);
  });
});

describe("css links", () => {
  test("links @use to the resolved partial", () => {
    const text = style('@use "tokens" as t;');
    const links = cssLinks(text, component);
    expect(links).toHaveLength(1);
    expect(links[0]?.path).toBe(tokens);
    const range = links[0]?.range;
    expect(range && text.slice(range.start, range.end)).toBe("tokens");
  });

  test("links @import to the resolved partial", () => {
    const text = style('@import "palette";');
    expect(cssLinks(text, component)[0]?.path).toBe(palette);
  });

  test("returns nothing without a component path", () => {
    expect(cssLinks(style('@use "tokens" as t;'))).toEqual([]);
  });
});

describe("css cross-file scss", () => {
  test("defines a namespaced variable in the imported file", () => {
    const { text, offset } = marked(style('@use "tokens" as t;\n.card {\n  color: t.$bra|nd;\n}'));
    const target = cssDefinitions(text, offset, component)[0];
    expect(target?.path).toBe(tokens);
    expect(target?.range).toEqual({ start: 0, end: 6 });
  });

  test("hovers a namespaced variable with its value and file", () => {
    const { text, offset } = marked(style('@use "tokens" as t;\n.card {\n  color: t.$bra|nd;\n}'));
    const hover = cssHover(text, offset, component);
    expect(hover?.kind).toBe("markdown");
    if (hover?.kind !== "markdown") return;
    expect(hover.markdown).toContain("$brand");
    expect(hover.markdown).toContain("#ff0000");
    expect(hover.markdown).toContain("_tokens.scss");
  });

  test("defines and hovers a namespaced mixin", () => {
    const { text, offset } = marked(
      style('@use "tokens" as t;\n.card {\n  @include t.ro|w(2px);\n}'),
    );
    expect(cssDefinitions(text, offset, component)[0]).toEqual({
      path: tokens,
      range: { start: 24, end: 27 },
    });
    const hover = cssHover(text, offset, component);
    expect(hover?.kind).toBe("markdown");
    if (hover?.kind !== "markdown") return;
    expect(hover.markdown).toContain("@mixin row");
    expect(hover.markdown).toContain("$gap");
  });

  test("completes namespaced variables and mixins", () => {
    const variable = marked(style('@use "tokens" as t;\n.card {\n  color: t.$br|\n}'));
    const variableLabels = cssCompletions(variable.text, variable.offset, component).map(
      (item) => item.label,
    );
    expect(variableLabels).toContain("$brand");
    const mixin = marked(style('@use "tokens" as t;\n.card {\n  @include t.|\n}'));
    const mixinLabels = cssCompletions(mixin.text, mixin.offset, component).map(
      (item) => item.label,
    );
    expect(mixinLabels).toContain("row");
  });

  test("renames a namespaced variable in both files", () => {
    const { text, offset } = marked(style('@use "tokens" as t;\n.card {\n  color: t.$bra|nd;\n}'));
    expect(cssRenameRange(text, offset, component)).toEqual({
      start: text.indexOf("$brand"),
      end: text.indexOf("$brand") + 6,
    });
    const files = cssRename(text, offset, "accent", component) ?? [];
    const componentEdits = files.find((file) => file.path === undefined)?.edits ?? [];
    const start = text.indexOf("$brand");
    expect(componentEdits).toEqual([{ range: { start, end: start + 6 }, newText: "$accent" }]);
    const imported = files.find((file) => file.path === tokens);
    expect(imported?.edits).toContainEqual({ range: { start: 0, end: 6 }, newText: "$accent" });
  });

  test("renames a namespaced mixin in both files", () => {
    const { text, offset } = marked(
      style('@use "tokens" as t;\n.card {\n  @include t.ro|w(2px);\n}'),
    );
    const imported = cssRename(text, offset, "line", component)?.find(
      (file) => file.path === tokens,
    );
    expect(imported?.edits).toContainEqual({ range: { start: 24, end: 27 }, newText: "line" });
  });

  test("follows @import to a transitively imported variable", () => {
    const { text, offset } = marked(style('@import "all";\n.card {\n  color: $in|k;\n}'));
    expect(cssDefinitions(text, offset, component)[0]?.path).toBe(palette);
    expect(cssHover(text, offset, component)?.kind).toBe("markdown");
  });

  test("finds nothing for scss members without a component path", () => {
    const { text, offset } = marked(style('@use "tokens" as t;\n.card {\n  color: t.$bra|nd;\n}'));
    expect(cssDefinitions(text, offset)).toEqual([]);
  });
});

describe("css colors", () => {
  const text = style(".a {\n  color: #00ff00;\n}");
  const offset = text.indexOf("#00ff00") + 3;

  test("lists the colours of the style", () => {
    const colors = cssColors(text);
    expect(colors).toHaveLength(1);
    expect(colors[0]?.color).toEqual({ red: 0, green: 1, blue: 0, alpha: 1 });
    const range = colors[0]?.range;
    expect(range && text.slice(range.start, range.end)).toBe("#00ff00");
  });

  test("offers the colour presentations", () => {
    const presentations = cssColorPresentations(text, offset);
    const labels = presentations.map((item) => item.label);
    expect(labels).toContain("#00ff00");
    expect(labels).toContain("rgb(0, 255, 0)");
    expect(presentations[0]?.edit.range).toEqual(cssColors(text)[0]?.range);
  });

  test("returns nothing outside a colour", () => {
    expect(cssColorPresentations(text, text.indexOf(".a"))).toEqual([]);
  });
});

describe("css document structure", () => {
  test("lists variables, mixins and rules as symbols", () => {
    const text = style(
      "$brand: #f00;\n@mixin row($gap: 1px) {\n  display: flex;\n}\n.card {\n  color: $brand;\n}",
    );
    const symbols = cssSymbols(text);
    const kinds = new Map(symbols.map((symbol) => [symbol.name, symbol.kind]));
    expect(kinds.get("$brand")).toBe("variable");
    expect(kinds.get("row")).toBe("mixin");
    expect(kinds.get(".card")).toBe("class");
  });

  test("folds rules and at-rule blocks", () => {
    const text = style(".card {\n  color: red;\n}\n@scoped {\n  .other { color: blue; }\n}");
    const ranges = cssFolding(text);
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    const first = ranges[0];
    expect(first && first.start < first.end).toBe(true);
    expect(first && text.slice(first.start, first.end)).toContain("color");
  });

  test("builds a selection chain inside a declaration", () => {
    const text = style(".card {\n  color: red;\n}");
    const [inside, outside] = cssSelection(text, [text.indexOf("color") + 2, 0]);
    expect(inside?.range.start).toBeLessThanOrEqual(text.indexOf("color") + 2);
    expect(inside?.range.end).toBeGreaterThanOrEqual(text.indexOf("color") + 2);
    expect(inside?.parent).toBeDefined();
    expect(outside).toBeUndefined();
  });
});

describe("css code actions", () => {
  const text = style(".a { floop: 1; }");
  const diagnostics = cssDiagnostics(text);
  const [diagnostic] = diagnostics;

  test("offers the unknown property rename", () => {
    const actions = cssCodeActions(
      text,
      diagnostic?.range.start ?? 0,
      diagnostic?.range.end ?? 0,
      diagnostics,
    );
    const action = actions.find((item) => item.title.startsWith("Rename to"));
    expect(action?.title).toBe("Rename to 'float'");
    const start = text.indexOf("floop");
    expect(action?.edits?.[0]).toEqual({ range: { start, end: start + 5 }, newText: "float" });
  });

  test("offers nothing outside a style block", () => {
    expect(cssCodeActions("<p>floop</p>", 3, 8, [])).toEqual([]);
  });
});
