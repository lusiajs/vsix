import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ScriptSymbol } from "lusiajs/editor/script/symbols.ts";
import type { LusiaHost } from "./host/types.ts";

const CACHE_LIMIT = 100;
const TYPESCRIPT_EXTENSION = /\.tsx?$/;
const cache = new Map<string, ScriptSymbol[]>();

/** The symbols a relative import specifier points at, or none when it is missing or not TypeScript. */
export function scriptSymbols(
  host: LusiaHost,
  documentPath: string,
  specifier: string,
): ScriptSymbol[] {
  if (!isRelative(specifier)) return [];
  const path = symbolPath(documentPath, specifier);
  if (!path) return [];
  try {
    return symbolsAt(host, path, specifier);
  } catch {
    return [];
  }
}

export function clearScriptSymbolsCache(): void {
  cache.clear();
}

function symbolsAt(
  host: LusiaHost,
  path: string,
  specifier: string,
): ScriptSymbol[] {
  const stat = statSync(path);
  const key = `${path}\n${stat.mtimeMs}\n${stat.size}`;
  const cached = cache.get(key);
  if (cached) return withSpecifier(cached, specifier);
  const symbols = host.scriptSymbols.exportedSymbols(
    readFileSync(path, "utf8"),
    specifier,
  );
  remember(key, symbols);
  return symbols;
}

function remember(key: string, symbols: ScriptSymbol[]): void {
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, symbols);
}

/** A cached file read under one specifier; re-label it when another specifier points at the same file. */
function withSpecifier(
  symbols: ScriptSymbol[],
  specifier: string,
): ScriptSymbol[] {
  if (symbols.every((symbol) => symbol.specifier === specifier)) return symbols;
  return symbols.map((symbol) => ({ ...symbol, specifier }));
}

function symbolPath(
  documentPath: string,
  specifier: string,
): string | undefined {
  const base = resolve(dirname(documentPath), specifier);
  return candidates(base).find((candidate) => existsSync(candidate));
}

function candidates(base: string): string[] {
  if (TYPESCRIPT_EXTENSION.test(base)) return [base];
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}
