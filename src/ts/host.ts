import type * as TypeScript from "typescript";
import { dirname, resolve } from "node:path";
import type { TypeScriptModule } from "./load.ts";
import { realPathOf } from "./map.ts";

export class VirtualFiles {
  private readonly files = new Map<string, { text: string; version: number }>();
  private serial = 0;

  set(fileName: string, text: string): void {
    if (this.files.get(fileName)?.text === text) return;
    this.files.set(fileName, { text, version: ++this.serial });
  }

  delete(fileName: string): void {
    this.files.delete(fileName);
  }

  has(fileName: string): boolean {
    return this.files.has(fileName);
  }

  textOf(fileName: string): string | undefined {
    return this.files.get(fileName)?.text;
  }

  versionOf(fileName: string): string | undefined {
    const version = this.files.get(fileName)?.version;
    return version === undefined ? undefined : `${version}`;
  }

  projectVersion(): string {
    return `${this.serial}`;
  }
}

export interface HostOptions {
  typescript: TypeScriptModule;
  /** Every root virtual file open in the workspace. */
  roots: () => readonly string[];
  /** The project files the tsconfig covers, so auto-import can find their symbols. */
  projectFiles: readonly string[];
  directory: string;
  compilerOptions: TypeScript.CompilerOptions;
  files: VirtualFiles;
  /** Generates the module for an imported `.lusia` file, or undefined when it is missing. */
  component: (fileName: string) => string | undefined;
}

export function createLanguageHost(
  options: HostOptions,
): TypeScript.LanguageServiceHost {
  const { typescript: ts, files } = options;
  const moduleHost = createModuleHost(ts, files);
  return {
    getScriptFileNames: () => [
      ...new Set([...options.roots(), ...options.projectFiles]),
    ],
    getScriptVersion: (fileName) =>
      files.versionOf(fileName) ?? modifiedVersion(ts, fileName),
    getScriptSnapshot: (fileName) => snapshot(ts, files, fileName),
    getCurrentDirectory: () => options.directory,
    getCompilationSettings: () => options.compilerOptions,
    getDefaultLibFileName: (settings) => ts.getDefaultLibFilePath(settings),
    getProjectVersion: () => files.projectVersion(),
    fileExists: (fileName) =>
      files.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) => files.textOf(fileName) ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    resolveModuleNames: (names, containing) =>
      names.map((name) =>
        resolveModule(ts, options, moduleHost, name, containing),
      ),
  };
}

function resolveModule(
  ts: TypeScriptModule,
  options: HostOptions,
  moduleHost: TypeScript.ModuleResolutionHost,
  name: string,
  containing: string,
): TypeScript.ResolvedModule | undefined {
  if (!isComponentImport(name)) {
    return ts.resolveModuleName(
      name,
      containing,
      options.compilerOptions,
      moduleHost,
    ).resolvedModule;
  }
  const fileName = resolve(dirname(realPathOf(containing)), name);
  const shim = options.component(fileName);
  if (shim === undefined) return undefined;
  return { resolvedFileName: shim, isExternalLibraryImport: false };
}

function isComponentImport(name: string): boolean {
  return (
    (name.startsWith("./") || name.startsWith("../")) && name.endsWith(".lusia")
  );
}

function createModuleHost(
  ts: TypeScriptModule,
  files: VirtualFiles,
): TypeScript.ModuleResolutionHost {
  return {
    fileExists: (fileName) =>
      files.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) => files.textOf(fileName) ?? ts.sys.readFile(fileName),
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  };
}

function snapshot(
  ts: TypeScriptModule,
  files: VirtualFiles,
  fileName: string,
): TypeScript.IScriptSnapshot | undefined {
  const text = files.textOf(fileName) ?? ts.sys.readFile(fileName);
  return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
}

function modifiedVersion(ts: TypeScriptModule, fileName: string): string {
  const time = ts.sys.getModifiedTime?.(fileName);
  return time === undefined ? "0" : `${time.getTime()}`;
}
