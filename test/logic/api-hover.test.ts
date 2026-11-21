import { describe, expect, test } from "bun:test";
import { api, type ApiEntry } from "lusiajs/api";
import { apiHoverMarkdown, declarationOf } from "../../src/logic/api-hover.ts";

function entryNamed(name: string): ApiEntry {
  const entry = api.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`Missing ${name}`);
  return entry;
}

describe("api hover markdown", () => {
  test("shows the compact declaration of EASE, not the expanded type", () => {
    const markdown = apiHoverMarkdown(entryNamed("EASE"));
    expect(markdown.startsWith("```ts\nconst EASE: { STYLE, IN, OUT, INOUT }\n```")).toBe(true);
    expect(markdown).not.toContain("readonly");
    expect(markdown).not.toContain("EaseStyle");
  });

  test("lists every EASE member, nested style curves included, in the table", () => {
    const markdown = apiHoverMarkdown(entryNamed("EASE"));
    expect(markdown).toContain("| Value | What it does |");
    expect(markdown).toContain("| `STYLE` |");
    expect(markdown).toContain("| `STYLE.LINEAR` | Constant speed, no easing. |");
    expect(markdown).toContain("| `STYLE.BOUNCE` |");
    expect(markdown).toContain("| `INOUT` | Slow at both ends, fast in the middle. |");
  });

  test("orders the sections: declaration, summary, example, members", () => {
    const markdown = apiHoverMarkdown(entryNamed("EASE"));
    const order = [
      "const EASE",
      "Easing styles (curves)",
      "Example",
      "import { EASE }",
      "Members",
      "| Value | What it does |",
    ].map((part) => markdown.indexOf(part));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("shows the single-line signature of a function and no table", () => {
    const markdown = apiHoverMarkdown(entryNamed("detach()"));
    expect(markdown.startsWith("```ts\ndetach(): Promise<void>\n```")).toBe(true);
    expect(markdown).toContain("Removes a mounted component and stops its updates.");
    expect(markdown).not.toContain("| Value | What it does |");
    expect(markdown).not.toContain("Members");
  });

  test("uses html for markup entries", () => {
    const markdown = apiHoverMarkdown(entryNamed("<EACH>"));
    expect(markdown.startsWith("```html\n<EACH")).toBe(true);
  });

  test("shows the compact declaration for WHEN and PRESET", () => {
    expect(declarationOf(entryNamed("WHEN"))).toBe(
      "const WHEN: { ATTACH, DETACH, VIEW, HOVER, SCROLL, MOVE, RESIZE, MOVE_OR_RESIZE, MANUAL }",
    );
    expect(declarationOf(entryNamed("PRESET"))).toStartWith("const PRESET: { FADE_IN, FADE_OUT");
  });

  test("escapes pipes inside a table cell", () => {
    const entry: ApiEntry = {
      ...entryNamed("TURN"),
      members: [{ name: "A", summary: "one | two" }],
    };
    expect(apiHoverMarkdown(entry)).toContain("| `A` | one \\| two |");
  });

  test("every Lusia API entry renders without the raw TypeScript expansion", () => {
    for (const entry of api) {
      const markdown = apiHoverMarkdown(entry);
      expect(markdown).toContain(entry.summary);
      expect(markdown).toContain(entry.example);
      expect(markdown).not.toContain("(alias)");
    }
  });
});
