import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TOOLS_ENTRY, TOOLS_FALLBACK_FILE } from "./constants.ts";

export interface Manifest {
  version?: string;
  exports?: Record<string, unknown> | string;
}

export function readManifest(packagePath: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(packagePath, "utf8")) as Manifest;
  } catch {
    return undefined;
  }
}

/** The file the editor entry points at: `exports["./vscode"].import`, else the fallback file. */
export function entryPathOf(packagePath: string, manifest: Manifest): string {
  const entry = typeof manifest.exports === "object" ? manifest.exports[TOOLS_ENTRY] : undefined;
  const relative = typeof entry === "string" ? entry : (importTarget(entry) ?? TOOLS_FALLBACK_FILE);
  return join(dirname(packagePath), relative);
}

function importTarget(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const target = (entry as { import?: unknown }).import;
  return typeof target === "string" ? target : undefined;
}
