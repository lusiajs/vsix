import { describe, expect, test } from "bun:test";
import { LuciaError } from "../../../src/compiler/errors.ts";
import { compile } from "../../../src/compiler/index.ts";
import { errorPosition } from "../../../editors/vscode/src/logic/error-position.ts";

describe("error position", () => {
  test("reads the position of a LuciaError and drops the file prefix", () => {
    const error = new LuciaError("bad", "a.lucia", 3, 4);
    expect(errorPosition(error)).toEqual({ line: 3, column: 4, message: "bad" });
  });

  test("points at the export line of a compile error", () => {
    const source = "<script>\nexport const x = 1;\n</script>";
    try {
      compile(source, "/proj/a.lucia");
      throw new Error("expected a compile error");
    } catch (error) {
      const position = errorPosition(error);
      expect(position.line).toBe(2);
      expect(position.message).toContain("cannot export");
    }
  });

  test("falls back to line 1 for other errors", () => {
    expect(errorPosition(new Error("boom"))).toEqual({ line: 1, column: 1, message: "boom" });
  });
});
