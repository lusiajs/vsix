import { describe, expect, test } from "bun:test";
import { missingPropName } from "../../src/ts/props-fix.ts";

describe("missingPropName", () => {
  test("reads the property an object-form holder is missing", () => {
    expect(missingPropName("Property 'size' does not exist on type 'PropsClass'.")).toBe("size");
  });

  test("reads the name a destructured form is missing", () => {
    expect(missingPropName("Cannot find name 'size'.")).toBe("size");
  });

  test("ignores other errors", () => {
    expect(missingPropName("Type 'number' is not assignable to type 'string'.")).toBeUndefined();
  });
});
