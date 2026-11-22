import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { PropDef } from "lusiajs/language/parse/props.ts";
import type { LusiaHost } from "./host/types.ts";

/** The file an imported component tag points at, if it exists on disk. */
export function componentPath(
  host: LusiaHost,
  documentPath: string,
  text: string,
  name: string,
): string | undefined {
  const found = host.parseImports.findComponentImport(text, name);
  if (!found) return undefined;
  const path = resolveImportPath(documentPath, found.specifier);
  return existsSync(path) ? path : undefined;
}

/** The props a component declares, or undefined when its file cannot be read. */
export function declaredProps(
  host: LusiaHost,
  documentPath: string,
  text: string,
  name: string,
): PropDef[] | undefined {
  const path = componentPath(host, documentPath, text, name);
  return path ? host.parseProps.parsePropDefs(readFileSync(path, "utf8")) : undefined;
}

export function componentProps(
  host: LusiaHost,
  documentPath: string,
  text: string,
  name: string,
): PropDef[] {
  return declaredProps(host, documentPath, text, name) ?? [];
}

function resolveImportPath(documentPath: string, specifier: string): string {
  return resolve(dirname(documentPath), specifier);
}
