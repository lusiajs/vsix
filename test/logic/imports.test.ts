import { describe, expect, test } from "bun:test";
import {
  parseLusiaImports,
  resolveImportPath,
  scriptImports,
} from "../../../editors/vscode/src/logic/imports.ts";
import { planLusiaImport } from "../../../editors/vscode/src/logic/auto-import.ts";

describe("lusia imports", () => {
  test("reads default imports of .lusia files only", () => {
    const script = `import Badge from "./badge.lusia";\nimport { variable } from "lusia";\nimport Card, { x } from './card.lusia';`;
    expect(parseLusiaImports(script)).toEqual([
      { name: "Badge", specifier: "./badge.lusia", index: 0 },
      { name: "Card", specifier: "./card.lusia", index: script.indexOf("import Card") },
    ]);
  });

  test("ignores import-looking text outside the script", () => {
    expect(scriptImports(`<p>import X from "./a.lusia"</p>`)).toEqual([]);
  });

  test("resolves a specifier next to the document", () => {
    expect(resolveImportPath("/proj/src/App.lusia", "./badge.lusia")).toBe("/proj/src/badge.lusia");
  });
});

describe("auto import", () => {
  function apply(script: string, edit: { start: number; end: number; text: string }): string {
    return script.slice(0, edit.start) + edit.text + script.slice(edit.end);
  }

  test("creates an import when the script has none", () => {
    const script = "\nconst x = 1;\n";
    const edit = planLusiaImport(script, "variable");
    expect(edit && apply(script, edit)).toBe('import { variable } from "lusia";\n\nconst x = 1;\n');
  });

  test("adds the name to an existing lusia import", () => {
    const other = 'import { props } from "lusia";\n';
    const added = planLusiaImport(other, "variable");
    expect(added && apply(other, added)).toBe('import { props, variable } from "lusia";\n');
  });

  test("adds nothing when the name is already imported", () => {
    expect(planLusiaImport('import { variable } from "lusia";', "variable")).toBeUndefined();
  });
});
