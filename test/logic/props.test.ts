import { describe, expect, test } from "bun:test";
import { objectEntries } from "../../../editors/vscode/src/logic/object-literal.ts";
import { parsePropDefs } from "../../../editors/vscode/src/logic/props.ts";

describe("object entries", () => {
  test("splits top-level entries and ignores commas in strings", () => {
    expect(objectEntries("x({a: 1, b: 'c,d'})", 2)).toEqual(["a: 1", "b: 'c,d'"]);
  });

  test("keeps nested braces and strings together", () => {
    expect(objectEntries(`({ a: { b: "}" }, c: [1, 2] })`, 1)).toEqual([
      `a: { b: "}" }`,
      "c: [1, 2]",
    ]);
  });
});

describe("props", () => {
  test("reads keys and their default text", () => {
    const source = `const { label, tone } = props({ label: "New", tone: "info" });`;
    expect(parsePropDefs(source)).toEqual([
      { name: "label", defaultValue: '"New"' },
      { name: "tone", defaultValue: '"info"' },
    ]);
  });

  test("handles nested defaults", () => {
    const source = `props({ items: [1, 2], opts: { a: "}" }, flag: true })`;
    expect(parsePropDefs(source)).toEqual([
      { name: "items", defaultValue: "[1, 2]" },
      { name: "opts", defaultValue: `{ a: "}" }` },
      { name: "flag", defaultValue: "true" },
    ]);
  });

  test("handles shorthand and quoted keys", () => {
    expect(parsePropDefs(`props({ label, "data-x": 3 })`)).toEqual([
      { name: "label" },
      { name: "data-x", defaultValue: "3" },
    ]);
  });

  test("returns nothing without a props call", () => {
    expect(parsePropDefs("const x = { label: 1 };")).toEqual([]);
  });
});
