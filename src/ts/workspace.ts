import type * as TypeScript from "typescript";
import { dirname } from "node:path";
import { compilerOptionsFor, type Config } from "./config.ts";
import { createLanguageHost, VirtualFiles } from "./host.ts";
import { loadTypeScript, type TypeScriptModule } from "./load.ts";
import { componentModule, componentVersion } from "./modules.ts";

/** One TypeScript program per tsconfig, so lib files and imports are checked once. */
export class Workspace {
  private static readonly cache = new Map<string, Workspace>();

  static for(fileName: string): Workspace | undefined {
    const typescript = loadTypeScript(dirname(fileName));
    if (typescript === undefined) return undefined;
    const config = compilerOptionsFor(typescript, fileName);
    const cached = Workspace.cache.get(config.directory);
    if (cached) return cached;
    const workspace = new Workspace(typescript, config);
    Workspace.cache.set(config.directory, workspace);
    return workspace;
  }

  readonly files = new VirtualFiles();
  readonly service: TypeScript.LanguageService;
  private readonly roots = new Set<string>();
  private readonly components = new Map<string, number>();

  private constructor(
    readonly typescript: TypeScriptModule,
    private readonly config: Config,
  ) {
    this.service = typescript.createLanguageService(
      createLanguageHost({
        typescript,
        roots: () => [...this.roots],
        projectFiles: config.fileNames,
        directory: config.directory,
        compilerOptions: config.options,
        files: this.files,
        component: (fileName) => this.component(fileName),
      }),
    );
  }

  addRoot(fileName: string): void {
    this.roots.add(fileName);
  }

  removeRoot(fileName: string): void {
    this.roots.delete(fileName);
    this.files.delete(fileName);
    if (this.roots.size === 0) Workspace.cache.delete(this.config.directory);
  }

  /** Rebuilds the modules of components whose source changed, so a parent sees unsaved edits. */
  refreshComponents(): void {
    for (const [fileName, version] of this.components) {
      if (componentVersion(fileName) === version) continue;
      componentModule(fileName, this.files);
      this.components.set(fileName, componentVersion(fileName));
    }
  }

  private component(fileName: string): string | undefined {
    const shim = componentModule(fileName, this.files);
    if (shim !== undefined) this.components.set(fileName, componentVersion(fileName));
    return shim;
  }
}
