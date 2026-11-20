import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { componentPath } from "../../../editors/vscode/src/component-file.ts";

const PARENT = join(import.meta.dir, "../fixtures/lint/Parent.lusia");
const BADGE = join(import.meta.dir, "../fixtures/lint/badge.lusia");
const BADGE_IMPORT = '<script>\nimport Badge from "./badge.lusia";\n</script>\n';

describe("component file", () => {
  test("resolves an import specifier next to the document", () => {
    expect(componentPath(PARENT, BADGE_IMPORT, "Badge")).toBe(BADGE);
  });

  test("returns undefined for an import with no file on disk", () => {
    const source = '<script>\nimport Ghost from "./ghost.lusia";\n</script>\n';
    expect(componentPath(PARENT, source, "Ghost")).toBeUndefined();
  });
});
