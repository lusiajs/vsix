import { dirname, resolve } from "node:path";
import { scriptSection } from "./sections.ts";

export interface LuciaImport {
  name: string;
  specifier: string;
  /** Offset of the `import` keyword in the script text. */
  index: number;
}

const LUCIA_DEFAULT_IMPORT =
  /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\}\s*)?from\s*["']([^"'\n]+\.lucia)["']/g;

/** Default imports of `.lucia` files in a script's text. */
export function parseLuciaImports(script: string): LuciaImport[] {
  return [...script.matchAll(LUCIA_DEFAULT_IMPORT)].map((match) => ({
    name: match[1] ?? "",
    specifier: match[2] ?? "",
    index: match.index,
  }));
}

export function scriptImports(text: string): LuciaImport[] {
  const script = scriptSection(text);
  return script ? parseLuciaImports(text.slice(script.contentStart, script.contentEnd)) : [];
}

export function findComponentImport(text: string, name: string): LuciaImport | undefined {
  return scriptImports(text).find((item) => item.name === name);
}

export function resolveImportPath(documentPath: string, specifier: string): string {
  return resolve(dirname(documentPath), specifier);
}
