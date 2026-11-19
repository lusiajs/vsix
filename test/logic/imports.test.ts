import { describe, expect, test } from "bun:test";
import {
  parseLuciaImports,
  resolveImportPath,
  scriptImports,
} from "../../../editors/vscode/src/logic/imports.ts";
import { planLuciaImport } from "../../../editors/vscode/src/logic/auto-import.ts";

describe("lucia imports", () => {
  test("reads default imports of .lucia files only", () => {
    const script = `import Badge from "./badge.lucia";\nimport { store } from "lucia";\nimport Card, { x } from './card.lucia';`;
    expect(parseLuciaImports(script)).toEqual([
      { name: "Badge", specifier: "./badge.lucia", index: 0 },
      { name: "Card", specifier: "./card.lucia", index: script.indexOf("import Card") },
    ]);
  });

  test("ignores import-looking text outside the script", () => {
    expect(scriptImports(`<p>import X from "./a.lucia"</p>`)).toEqual([]);
  });

  test("resolves a specifier next to the document", () => {
    expect(resolveImportPath("/proj/src/App.lucia", "./badge.lucia")).toBe("/proj/src/badge.lucia");
  });
});

describe("auto import", () => {
  function apply(script: string, edit: { start: number; end: number; text: string }): string {
    return script.slice(0, edit.start) + edit.text + script.slice(edit.end);
  }

  test("creates an import when the script has none", () => {
    const script = "\nconst x = 1;\n";
    const edit = planLuciaImport(script, "store");
    expect(edit && apply(script, edit)).toBe('import { store } from "lucia";\n\nconst x = 1;\n');
  });

  test("adds the name to an existing lucia import", () => {
    const other = 'import { props } from "lucia";\n';
    const added = planLuciaImport(other, "store");
    expect(added && apply(other, added)).toBe('import { props, store } from "lucia";\n');
  });

  test("adds nothing when the name is already imported", () => {
    expect(planLuciaImport('import { store } from "lucia";', "store")).toBeUndefined();
  });
});
