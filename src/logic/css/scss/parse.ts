import { readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseSymbols } from "scss-symbols-parser";
import type { IMixin, IVariable } from "scss-symbols-parser";

export interface ScssPath {
  value: string;
  /** The offset of the path text in the file, quotes excluded. */
  offset: number;
}

export interface ScssDirective {
  kind: "use" | "forward" | "import";
  paths: ScssPath[];
  /** The `as` alias of a `@use`; `*` loads the module globally. */
  namespace?: string;
  global: boolean;
}

export interface ScssFile {
  path: string;
  mtimeMs: number;
  text: string;
  directives: ScssDirective[];
  variables: IVariable[];
  mixins: IMixin[];
  functions: IMixin[];
}

const DIRECTIVE = /@(use|forward|import)\s+([^;{}]+)/g;
const QUOTED = /["']([^"']+)["']/g;
const NAMESPACE = /as\s+(\*|[A-Za-z_][\w-]*)\b/;
const FILE_EXTENSIONS = [".scss", ".sass"];

const files = new Map<string, ScssFile>();
const MAX_FILES = 128;

export function readScssFile(path: string): ScssFile | undefined {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
  const cached = files.get(path);
  if (cached && cached.mtimeMs === mtimeMs) return cached;
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  const symbols = parseSymbols(text);
  const file: ScssFile = {
    path,
    mtimeMs,
    text,
    directives: parseDirectives(text),
    variables: symbols.variables,
    mixins: symbols.mixins,
    functions: symbols.functions,
  };
  remember(file);
  return file;
}

export function parseDirectives(text: string): ScssDirective[] {
  const directives: ScssDirective[] = [];
  const directive = new RegExp(DIRECTIVE.source, "g");
  let match = directive.exec(text);
  while (match) {
    const kind = match[1] as ScssDirective["kind"];
    const body = match[2] ?? "";
    const bodyOffset = (match.index ?? 0) + (match[0]?.length ?? 0) - body.length;
    const paths = quotedPaths(body, bodyOffset);
    if (paths.length > 0) {
      const namespace = kind === "use" ? NAMESPACE.exec(body)?.[1] : undefined;
      directives.push({
        kind,
        paths,
        namespace: namespace === "*" ? undefined : namespace,
        global: namespace === "*",
      });
    }
    match = directive.exec(text);
  }
  return directives;
}

/** Resolves an `@use`/`@import` specifier to a file, partials included. */
export function resolveScssModule(fromFile: string, specifier: string): string | undefined {
  if (!isFileSpecifier(specifier)) return undefined;
  const base = resolve(dirname(fromFile), specifier.replace(/\.(scss|sass)$/i, ""));
  return candidates(base).find(isFile);
}

/** The namespace Sass gives a `@use` without `as`. */
export function defaultNamespace(path: string): string {
  const name = basename(path)
    .replace(/^_/, "")
    .replace(/\.(scss|sass)$/i, "");
  return name === "index" ? basename(dirname(path)) : name;
}

function quotedPaths(body: string, bodyOffset: number): ScssPath[] {
  const paths: ScssPath[] = [];
  const quoted = new RegExp(QUOTED.source, "g");
  let match = quoted.exec(body);
  while (match) {
    const value = match[1] ?? "";
    const start = match.index + 1;
    paths.push({ value, offset: bodyOffset + start });
    match = quoted.exec(body);
  }
  return paths;
}

function candidates(base: string): string[] {
  const dir = dirname(base);
  const name = basename(base);
  const partial = name.startsWith("_") ? name : `_${name}`;
  const list: string[] = [];
  for (const extension of FILE_EXTENSIONS) {
    list.push(join(dir, `${name}${extension}`), join(dir, `${partial}${extension}`));
  }
  for (const extension of FILE_EXTENSIONS) {
    list.push(join(base, `index${extension}`), join(base, `_index${extension}`));
  }
  return list;
}

function isFileSpecifier(specifier: string): boolean {
  return (
    !/^[a-z]+:/i.test(specifier) &&
    !specifier.startsWith("//") &&
    !specifier.includes("#") &&
    !/\.css$/i.test(specifier)
  );
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function remember(file: ScssFile): void {
  files.set(file.path, file);
  if (files.size <= MAX_FILES) return;
  const oldest = files.keys().next();
  if (!oldest.done) files.delete(oldest.value);
}
