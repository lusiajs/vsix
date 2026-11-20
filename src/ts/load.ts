import { createRequire } from "node:module";
import { join } from "node:path";

export type TypeScriptModule = typeof import("typescript");

const cache = new Map<string, TypeScriptModule>();
const MODULE = "typescript";
let fallback: TypeScriptModule | undefined;
let loading: Promise<void> | undefined;

/**
 * The TypeScript the editor checks a component with: the workspace's own version when it installs
 * one, else the version the extension bundles, so a project needs no TypeScript install.
 */
export function loadTypeScript(startDir: string): TypeScriptModule | undefined {
  return workspaceTypeScript(startDir) ?? fallback;
}

/** Starts loading the extension's TypeScript, so a workspace without one still gets the features. */
export function preloadTypeScript(): void {
  loading ??= import("typescript")
    .then((module) => {
      fallback =
        (module as { default?: TypeScriptModule }).default ??
        (module as TypeScriptModule);
    })
    .catch(() => undefined);
}

function workspaceTypeScript(startDir: string): TypeScriptModule | undefined {
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
