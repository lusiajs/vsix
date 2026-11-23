import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TsProject } from "../../src/ts/project.ts";
import { realHost } from "../support/real-host.ts";

const TMP = resolve(import.meta.dir, "../../.agent/tmp");
const RUNTIME = fileURLToPath(import.meta.resolve("lusiajs"));

export interface Workspace {
  root: string;
  write(name: string, text: string): string;
  open(name: string, text: string): TsProject;
  dispose(): void;
}

/** A throwaway Lusia workspace whose tsconfig points `lusiajs` at the repo runtime. */
export function createWorkspace(files: Record<string, string> = {}): Workspace {
  mkdirSync(TMP, { recursive: true });
  const root = mkdtempSync(join(TMP, "ts-"));
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        allowImportingTsExtensions: true,
        lib: ["ESNext", "DOM", "DOM.Iterable"],
        paths: { lusiajs: [RUNTIME] },
      },
    }),
  );
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  const opened: string[] = [];
  return {
    root,
    write(name: string, text: string) {
      const file = join(root, name);
      writeFileSync(file, text);
      return file;
    },
    open(name: string, text: string) {
      const file = join(root, name);
      writeFileSync(file, text);
      opened.push(file);
      return TsProject.open(realHost, file, text);
    },
    dispose() {
      for (const file of opened) TsProject.forget(file);
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** The offset just past `needle`, for putting a cursor after a dot or an open parenthesis. */
export function after(source: string, needle: string): number {
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`Missing ${JSON.stringify(needle)}`);
  return index + needle.length;
}
