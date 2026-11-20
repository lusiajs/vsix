import type * as TypeScript from "typescript";
import { dirname } from "node:path";
import type { TypeScriptModule } from "./load.ts";

export interface Config {
  options: TypeScript.CompilerOptions;
  directory: string;
}

/** The project's own tsconfig options, with the settings a virtual noEmit file needs forced on. */
export function compilerOptionsFor(ts: TypeScriptModule, fileName: string): Config {
  const fallback = defaults(ts);
  const directory = dirname(fileName);
  const configPath = ts.findConfigFile(directory, ts.sys.fileExists);
  if (configPath === undefined) return { options: fallback, directory };
  try {
    const read = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, ts.sys, dirname(configPath));
    return {
      options: { ...fallback, ...parsed.options, noEmit: true, allowImportingTsExtensions: true },
      directory: dirname(configPath),
    };
  } catch {
    return { options: fallback, directory };
  }
}

function defaults(ts: TypeScriptModule): TypeScript.CompilerOptions {
  return {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    allowImportingTsExtensions: true,
  };
}
