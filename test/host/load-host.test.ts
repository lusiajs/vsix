import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { vscode } from "../vscode/mock-vscode.ts";
import { fakeDocument } from "../vscode/vscode-stub.ts";
import { hostResultFor } from "../../src/host/load-host.ts";
import { HOST_NAMESPACES } from "../../src/host/types.ts";

const roots: string[] = [];
const workspace = vscode.workspace as unknown as {
  isTrusted: boolean;
  getWorkspaceFolder: (uri: unknown) => { uri: { fsPath: string } } | undefined;
};

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

interface Project {
  root: string;
  document: ReturnType<typeof fakeDocument>;
}

function project(): Project {
  const root = mkdtempSync(join(tmpdir(), "lusia-host-"));
  roots.push(root);
  mkdirSync(join(root, "src"));
  const fileName = join(root, "src", "App.lusia");
  workspace.getWorkspaceFolder = () => ({ uri: { fsPath: root } });
  workspace.isTrusted = true;
  return { root, document: fakeDocument(fileName, "<p>hi</p>") };
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}

function installTools(
  root: string,
  options: { version?: string; entry?: string; source?: string } = {},
): void {
  const packageDir = join(root, "node_modules", "@lusiajs", "language-tools");
  writeJson(join(packageDir, "package.json"), {
    name: "@lusiajs/language-tools",
    version: options.version ?? "0.1.0",
    exports: { "./vscode": { types: "./dist/vscode.d.ts", import: "./dist/vscode.js" } },
  });
  const exports = HOST_NAMESPACES.map((name) => `export const ${name} = {};`).join("\n");
  const source =
    options.source ??
    `export const EDITOR_API_VERSION = 1;\nexport const LUSIA_VERSION = "0.1.0";\n${exports}\n`;
  mkdirSync(join(packageDir, "dist"), { recursive: true });
  writeFileSync(join(packageDir, "dist", "vscode.js"), options.entry ?? source);
}

function installLusia(root: string, version = "0.1.0"): void {
  writeJson(join(root, "node_modules", "lusiajs", "package.json"), { name: "lusiajs", version });
}

describe("loading the language host", () => {
  test("loads the entry from the project and reads the versions", async () => {
    const { root, document } = project();
    installTools(root);
    installLusia(root, "0.2.0");
    const result = await hostResultFor(document);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.info.toolsVersion).toBe("0.1.0");
    expect(result.info.lusiaVersion).toBe("0.2.0");
    expect(result.info.apiVersion).toBe(1);
    expect(result.info.entryPath).toBe(
      join(root, "node_modules", "@lusiajs", "language-tools", "dist", "vscode.js"),
    );
    expect(result.host.range).toEqual({});
  });

  test("reports every searched path when the language tools are not installed", async () => {
    const { root, document } = project();
    const result = await hostResultFor(document);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatchObject({ cause: "notInstalled", lusiaInstalled: false });
    if (result.failure.cause !== "notInstalled") return;
    expect(result.failure.searched).toContain(
      join(root, "src", "node_modules", "@lusiajs", "language-tools", "package.json"),
    );
    expect(result.failure.searched).toContain(
      join(root, "node_modules", "@lusiajs", "language-tools", "package.json"),
    );
  });

  test("says lusiajs is present when only the language tools are missing", async () => {
    const { root, document } = project();
    installLusia(root, "0.1.0");
    const result = await hostResultFor(document);
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.cause !== "notInstalled") return;
    expect(result.failure.lusiaInstalled).toBe(true);
    expect(result.failure.lusiaVersion).toBe("0.1.0");
  });

  test("fails for an old package without the vscode entry", async () => {
    const { root, document } = project();
    writeJson(join(root, "node_modules", "@lusiajs", "language-tools", "package.json"), {
      name: "@lusiajs/language-tools",
      version: "0.0.9",
    });
    const result = await hostResultFor(document);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.cause).toBe("noEntry");
  });

  test("fails when the entry uses another editor API version", async () => {
    const { root, document } = project();
    installTools(root, { source: "export const EDITOR_API_VERSION = 2;\n" });
    const result = await hostResultFor(document);
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.cause !== "apiVersion") return;
    expect(result.failure.apiVersion).toBe(2);
  });

  test("fails with the error when the entry throws on import", async () => {
    const { root, document } = project();
    installTools(root, { entry: 'throw new Error("boom");\n' });
    const result = await hostResultFor(document);
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.cause !== "importFailed") return;
    expect(String(result.failure.error)).toContain("boom");
  });

  test("does not load an untrusted project", async () => {
    const { root, document } = project();
    installTools(root);
    workspace.isTrusted = false;
    try {
      const result = await hostResultFor(document);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.cause).toBe("untrusted");
    } finally {
      workspace.isTrusted = true;
    }
  });
});

describe("version mismatch", () => {
  test("still loads when lusiajs and the language tools differ", async () => {
    const { root, document } = project();
    installTools(root, { version: "0.1.0" });
    installLusia(root, "0.2.0");
    const result = await hostResultFor(document);
    expect(result.ok).toBe(true);
  });
});
