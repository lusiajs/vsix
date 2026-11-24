import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import * as vscode from "vscode";
import { LUSIA_PACKAGE, SUPPORTED_API_VERSION, TOOLS_PACKAGES } from "./constants.ts";
import { locatePackage, type LocatedPackage } from "./locate.ts";
import { entryPathOf, readManifest } from "./manifest.ts";
import { reportHost, resetReports } from "./report.ts";
import type { HostFailure, HostResult } from "./result.ts";
import { HOST_NAMESPACES, OPTIONAL_HOST_NAMESPACES, type LusiaHost } from "./types.ts";

type ImportOutcome =
  { ok: true; host: LusiaHost; loadMs: number } | { ok: false; failure: HostFailure };

/** Imported editor modules, keyed by file and modification times, so an update reloads them. */
const imports = new Map<string, Promise<ImportOutcome>>();

export function resetHost(): void {
  imports.clear();
  resetReports();
}

/** The language host for a document's project, or undefined when it cannot be loaded. */
export async function hostFor(document: vscode.TextDocument): Promise<LusiaHost | undefined> {
  const result = await hostResultFor(document);
  reportHost(result, document);
  return result.ok ? result.host : undefined;
}

export async function hostResultFor(document: vscode.TextDocument): Promise<HostResult> {
  const start = dirname(document.fileName);
  const stop = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
  const tools = locateTools(start, stop);
  const lusia = locatePackage(LUSIA_PACKAGE, start, stop);
  const lusiaManifest = lusia.packagePath ? readManifest(lusia.packagePath) : undefined;
  const lusiaVersion = lusiaManifest?.version;
  if (tools.packagePath === undefined) {
    return failed({
      cause: "notInstalled",
      searched: tools.searched,
      lusiaInstalled: lusia.packagePath !== undefined,
      lusiaVersion,
    });
  }
  const toolsManifest = readManifest(tools.packagePath) ?? {};
  const toolsVersion = toolsManifest.version ?? "unknown";
  const entryPath = entryPathOf(tools.packagePath, toolsManifest);
  if (!existsSync(entryPath)) {
    return failed({
      cause: "noEntry",
      packageName: tools.packageName,
      packagePath: tools.packagePath,
      toolsVersion,
    });
  }
  if (!vscode.workspace.isTrusted) return failed({ cause: "untrusted", entryPath });
  const outcome = await importOnce(
    entryPath,
    tools.packageName,
    toolsVersion,
    mtimeOf(tools.packagePath),
  );
  if (!outcome.ok) return failed(outcome.failure);
  return {
    ok: true,
    host: outcome.host,
    info: {
      entryPath,
      packageName: tools.packageName,
      toolsVersion,
      lusiaVersion,
      apiVersion: SUPPORTED_API_VERSION,
      loadMs: outcome.loadMs,
    },
  };
}

interface LocatedTools extends LocatedPackage {
  packageName: string;
}

/** Finds the first installed tools package. Older projects still have the fallback name. */
function locateTools(start: string, stop: string | undefined): LocatedTools {
  const searched: string[] = [];
  for (const packageName of TOOLS_PACKAGES) {
    const located = locatePackage(packageName, start, stop);
    searched.push(...located.searched);
    if (located.packagePath !== undefined) {
      return { packageName, packagePath: located.packagePath, searched };
    }
  }
  return { packageName: TOOLS_PACKAGES[0], packagePath: undefined, searched };
}

function importOnce(
  entryPath: string,
  packageName: string,
  toolsVersion: string,
  manifestTime: number,
): Promise<ImportOutcome> {
  const key = [entryPath, mtimeOf(entryPath), manifestTime].join("|");
  const cached = imports.get(key);
  if (cached) return cached;
  const outcome = importEntry(entryPath, packageName, toolsVersion);
  imports.set(key, outcome);
  return outcome;
}

async function importEntry(
  entryPath: string,
  packageName: string,
  toolsVersion: string,
): Promise<ImportOutcome> {
  const started = performance.now();
  try {
    const url = `${pathToFileURL(entryPath).href}?v=${mtimeOf(entryPath)}`;
    const module = (await import(url)) as Record<string, unknown>;
    if (module.EDITOR_API_VERSION !== SUPPORTED_API_VERSION) {
      const failure: HostFailure = {
        cause: "apiVersion",
        packageName,
        entryPath,
        toolsVersion,
        apiVersion: module.EDITOR_API_VERSION,
      };
      return { ok: false, failure };
    }
    const missing = HOST_NAMESPACES.filter((name) => module[name] === undefined);
    if (missing.length > 0) {
      const error = new Error(`missing namespaces: ${missing.join(", ")}`);
      const failure: HostFailure = {
        cause: "importFailed",
        packageName,
        entryPath,
        toolsVersion,
        error,
      };
      return { ok: false, failure };
    }
    const names = [...HOST_NAMESPACES, ...OPTIONAL_HOST_NAMESPACES];
    const namespaces = Object.fromEntries(names.map((name) => [name, module[name]]));
    const host = namespaces as unknown as LusiaHost;
    return { ok: true, host, loadMs: performance.now() - started };
  } catch (error) {
    const failure: HostFailure = {
      cause: "importFailed",
      packageName,
      entryPath,
      toolsVersion,
      error,
    };
    return { ok: false, failure };
  }
}

function failed(failure: HostFailure): HostResult {
  return { ok: false, failure };
}

function mtimeOf(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}
