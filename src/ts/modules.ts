import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { findSections } from "@language/sections.ts";
import { expressionEnd } from "./scan.ts";
import { flowDeclarations } from "./flow-declarations.ts";
import { virtualScript } from "./virtual.ts";

export interface VirtualSink {
  set(fileName: string, text: string): void;
}

const PROPS_CALL = /\bprops\s*(?:<[^>()]*>)?\s*\(\s*\{/;
const sources = new Map<string, { text: string; version: number }>();
let serial = 0;

/** The source a component currently has, so an unsaved edit is what its parent sees. */
export function rememberSource(fileName: string, text: string): void {
  if (sources.get(fileName)?.text === text) return;
  sources.set(fileName, { text, version: ++serial });
}

export function forgetSource(fileName: string): void {
  sources.delete(fileName);
}

export function componentVersion(fileName: string): number {
  return sources.get(fileName)?.version ?? 0;
}

export function componentLength(fileName: string): number | undefined {
  const open = sources.get(fileName);
  if (open) return open.text.length;
  try {
    return readFileSync(fileName, "utf8").length;
  } catch {
    return undefined;
  }
}

/**
 * Writes the child virtual file and the module a parent resolves: the default export is the
 * component itself, plus the props type the parent tooling reads.
 */
export function componentModule(fileName: string, sink: VirtualSink): string | undefined {
  const text = sources.get(fileName)?.text ?? readComponent(fileName);
  if (text === undefined) return undefined;
  const childPath = `${fileName}.ts`;
  sink.set(childPath, componentSource(text));
  const shimPath = `${fileName}.d.ts`;
  sink.set(shimPath, componentShim(childPath));
  return shimPath;
}

/** The TypeScript view of a component, with its props exported for the generated module. */
export function componentSource(text: string): string {
  const virtual = virtualScript(text);
  return `${virtual.text}${flowDeclarations(virtual.flowNames)}${propsDeclaration(scriptOf(text))}`;
}

function readComponent(fileName: string): string | undefined {
  try {
    return readFileSync(fileName, "utf8");
  } catch {
    return undefined;
  }
}

function scriptOf(text: string): string {
  const section = findSections(text).find((candidate) => candidate.kind === "script");
  return section === undefined ? "" : text.slice(section.contentStart, section.contentEnd);
}

function componentShim(childPath: string): string {
  const specifier = `./${basename(childPath)}`;
  return [
    'import type { Component } from "lusia";',
    `import type { LusiaProps } from ${JSON.stringify(specifier)};`,
    "declare const component: Component & { readonly props: LusiaProps };",
    "export default component;",
  ].join("\n");
}

function propsDeclaration(script: string): string {
  const call = PROPS_CALL.exec(script) ?? undefined;
  const open = call === undefined ? -1 : call.index + call[0].length - 1;
  const close = open === -1 ? -1 : expressionEnd(script, open);
  if (open === -1 || close === -1) return "\nexport type LusiaProps = {};\n";
  return [
    "",
    'import { props as __lusiaProps } from "lusia";',
    "type __LusiaPropValue<P> = P extends { readonly value: infer V } ? V : P;",
    `const __lusiaDefaults = (${script.slice(open, close + 1)});`,
    "const __lusiaPropsObject = __lusiaProps(__lusiaDefaults);",
    "export type LusiaProps = { [K in keyof typeof __lusiaPropsObject]: __LusiaPropValue<(typeof __lusiaPropsObject)[K]> };",
    "",
  ].join("\n");
}
