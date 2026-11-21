import { describe, expect, test } from "bun:test";
import {
  editorDocument,
  hoverText,
  offsetRange,
  toCompletionKind,
} from "../../src/logic/language-service.ts";

describe("editorDocument", () => {
  test("maps offsets and positions both ways", () => {
    const document = editorDocument("inmemory://a.lusia", "html", "one\ntwo\nthree");
    expect(document.positionAt(5)).toEqual({ line: 1, character: 1 });
    expect(document.offsetAt({ line: 2, character: 3 })).toBe(11);
    expect(document.lineCount).toBe(3);
  });
});

describe("toCompletionKind", () => {
  test("maps the language server kinds the editor uses", () => {
    expect(toCompletionKind(3)).toBe("function");
    expect(toCompletionKind(10)).toBe("property");
    expect(toCompletionKind(12)).toBe("variable");
    expect(toCompletionKind(7)).toBe("class");
    expect(toCompletionKind(8)).toBe("type");
    expect(toCompletionKind(14)).toBe("keyword");
    expect(toCompletionKind(15)).toBe("snippet");
  });

  test("falls back to property for a missing or unknown kind", () => {
    expect(toCompletionKind(undefined)).toBe("property");
    expect(toCompletionKind(99)).toBe("property");
  });
});

describe("hoverText", () => {
  test("reads a markdown or plain text hover", () => {
    expect(hoverText({ contents: { kind: "markdown", value: "**div**" } })).toBe("**div**");
    expect(hoverText({ contents: { kind: "plaintext", value: "div" } })).toBe("div");
  });

  test("joins a list of strings and code blocks", () => {
    expect(
      hoverText({
        contents: ["The class attribute.", { language: "html", value: 'class="a"' }],
      }),
    ).toBe('The class attribute.\n\n```html\nclass="a"\n```');
  });

  test("keeps a single code block fenced", () => {
    expect(hoverText({ contents: { language: "css", value: "display: block;" } })).toBe(
      "```css\ndisplay: block;\n```",
    );
  });

  test("returns nothing for a missing or empty hover", () => {
    expect(hoverText(null)).toBeUndefined();
    expect(hoverText({ contents: "" })).toBeUndefined();
    expect(hoverText({ contents: [] })).toBeUndefined();
  });
});

describe("offsetRange", () => {
  test("turns a language server range into document offsets", () => {
    const document = editorDocument("inmemory://a.lusia", "html", "one\ntwo");
    expect(
      offsetRange(document, { start: { line: 0, character: 1 }, end: { line: 1, character: 2 } }),
    ).toEqual({
      start: 1,
      end: 6,
    });
  });

  test("returns nothing without a range", () => {
    const document = editorDocument("inmemory://a.lusia", "html", "one");
    expect(offsetRange(document, undefined)).toBeUndefined();
  });
});
