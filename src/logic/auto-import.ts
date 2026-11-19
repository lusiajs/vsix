export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

const NAMED_LUCIA_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']lucia["'];?/;

/**
 * An edit that adds `name` to the script's `import { ... } from "lucia"`.
 * Offsets are relative to the script text. Undefined when `name` is already imported.
 */
export function planLuciaImport(script: string, name: string): TextEdit | undefined {
  const match = NAMED_LUCIA_IMPORT.exec(script);
  if (!match) return { start: 0, end: 0, text: `import { ${name} } from "lucia";\n` };
  const names = (match[1] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (names.includes(name)) return undefined;
  const braceStart = match.index + match[0].indexOf("{");
  const braceEnd = match.index + match[0].indexOf("}") + 1;
  return { start: braceStart, end: braceEnd, text: `{ ${[...names, name].join(", ")} }` };
}
