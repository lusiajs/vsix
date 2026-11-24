import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { componentPath } from "../../src/component-file.ts";
import { realHost } from "../support/real-host.ts";

const PARENT = join(import.meta.dir, "../fixtures/lint/Parent.lusia");
const BADGE = join(import.meta.dir, "../fixtures/lint/badge.lusia");
const BADGE_IMPORT =
  '<script>\nimport Badge from "./badge.lusia";\n</script>\n';

describe("component file", () => {
  test("resolves an import specifier next to the document", () => {
    expect(componentPath(realHost, PARENT, BADGE_IMPORT, "Badge")).toBe(BADGE);
  });

  test("returns undefined for an import with no file on disk", () => {
    const source = '<script>\nimport Ghost from "./ghost.lusia";\n</script>\n';
    expect(componentPath(realHost, PARENT, source, "Ghost")).toBeUndefined();
  });
});
