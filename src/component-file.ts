import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { findComponentImport } from "@language/imports.ts";
import { parsePropDefs, type PropDef } from "@language/props.ts";

/** The file an imported component tag points at, if it exists on disk. */
export function componentPath(
  documentPath: string,
  text: string,
  name: string,
): string | undefined {
  const found = findComponentImport(text, name);
  if (!found) return undefined;
  const path = resolveImportPath(documentPath, found.specifier);
  return existsSync(path) ? path : undefined;
}

/** The props a component declares, or undefined when its file cannot be read. */
export function declaredProps(
  documentPath: string,
  text: string,
  name: string,
): PropDef[] | undefined {
  const path = componentPath(documentPath, text, name);
  return path ? parsePropDefs(readFileSync(path, "utf8")) : undefined;
}

export function componentProps(documentPath: string, text: string, name: string): PropDef[] {
  return declaredProps(documentPath, text, name) ?? [];
}

function resolveImportPath(documentPath: string, specifier: string): string {
  return resolve(dirname(documentPath), specifier);
}
