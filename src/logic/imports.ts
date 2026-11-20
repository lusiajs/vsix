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

// A top-level `const Name = lazy(...)` is a component too. Its file is the first import("...") in its statement.
const LAZY_DECLARATION = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*lazy\s*\(/gm;
const DYNAMIC_IMPORT = /import\(\s*["']([^"'\n]+)["']\s*\)/;
const NEXT_STATEMENT = /\n\S/g;

/** Default imports of `.lucia` files, and lazy() components, in a script's text. */
export function parseLuciaImports(script: string): LuciaImport[] {
  const imports = [...script.matchAll(LUCIA_DEFAULT_IMPORT)].map((match) => ({
    name: match[1] ?? "",
    specifier: match[2] ?? "",
    index: match.index,
  }));
  return [...imports, ...lazyComponents(script)].sort((a, b) => a.index - b.index);
}

function lazyComponents(script: string): LuciaImport[] {
  return [...script.matchAll(LAZY_DECLARATION)].map((match) => {
    const statement = script.slice(match.index, statementEnd(script, match.index));
    return {
      name: match[1] ?? "",
      specifier: DYNAMIC_IMPORT.exec(statement)?.[1] ?? "",
      index: match.index,
    };
  });
}

function statementEnd(script: string, from: number): number {
  NEXT_STATEMENT.lastIndex = from + 1;
  return NEXT_STATEMENT.exec(script)?.index ?? script.length;
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
