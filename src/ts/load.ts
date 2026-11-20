import { createRequire } from "node:module";
import { join } from "node:path";

export type TypeScriptModule = typeof import("typescript");

const cache = new Map<string, TypeScriptModule>();
const MODULE = "typescript";

/** The workspace's own TypeScript, so the editor checks code with the version the project builds with. */
export function loadTypeScript(startDir: string): TypeScriptModule | undefined {
  const require = createRequire(join(startDir, "package.json"));
  try {
    const entry = require.resolve(MODULE);
    const cached = cache.get(entry);
    if (cached) return cached;
    const loaded = require(MODULE) as TypeScriptModule;
    cache.set(entry, loaded);
    return loaded;
  } catch {
    return undefined;
  }
}
