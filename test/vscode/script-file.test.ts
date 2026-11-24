import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  clearScriptSymbolsCache,
  scriptSymbols,
} from "../../src/script-file.ts";
import { realHost } from "../support/real-host.ts";

const ADD = `/**
 * Adds two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;

let dir: string;

beforeEach(() => {
  clearScriptSymbolsCache();
  dir = mkdtempSync(join(tmpdir(), "lusia-script-symbols-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, code: string): string {
  const path = join(dir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, code);
  return path;
}

function names(specifier: string): string[] {
  return scriptSymbols(realHost, join(dir, "App.lusia"), specifier).map(
    (symbol) => symbol.name,
  );
}

describe("scriptSymbols", () => {
  test("reads the exports of a relative .ts file", () => {
    write("math.ts", ADD);
    expect(
      scriptSymbols(realHost, join(dir, "App.lusia"), "./math.ts"),
    ).toEqual([
      {
        name: "add",
        kind: "function",
        signature: "function add(a: number, b: number): number",
        isDefault: false,
        doc: "Adds two numbers.",
        specifier: "./math.ts",
      },
    ]);
  });

  test("resolves a specifier with no extension", () => {
    write("math.tsx", ADD);
    expect(
      scriptSymbols(realHost, join(dir, "App.lusia"), "./math")[0]?.specifier,
    ).toBe("./math");
    expect(names("./math")).toEqual(["add"]);
  });

  test("resolves index.ts in a folder", () => {
    write("lib/index.ts", ADD);
    expect(names("./lib")).toEqual(["add"]);
    expect(names("./lib/index.ts")).toEqual(["add"]);
  });

  test("returns nothing for a missing file", () => {
    expect(names("./ghost.ts")).toEqual([]);
    expect(names("./ghost")).toEqual([]);
  });

  test("returns nothing for an unreadable file", () => {
    mkdirSync(join(dir, "folder.ts"));
    expect(names("./folder.ts")).toEqual([]);
  });

  test("returns nothing for a bare package specifier", () => {
    expect(names("lusia")).toEqual([]);
    expect(names("math")).toEqual([]);
  });

  test("re-reads a rewritten file instead of the cached symbols", () => {
    const path = write("math.ts", "export const first = 1;\n");
    expect(names("./math.ts")).toEqual(["first"]);
    writeFileSync(path, "export const other = 1;\n");
    const later = new Date(Date.now() + 5000);
    utimesSync(path, later, later);
    expect(names("./math.ts")).toEqual(["other"]);
  });
});
