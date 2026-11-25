import { basename } from "node:path";
import { readFileSync } from "node:fs";
import type { LusiaHost } from "../host/types.ts";
import { flowDeclarations } from "./flow-declarations.ts";
import { virtualScript } from "./virtual.ts";

export interface VirtualSink {
  set(fileName: string, text: string): void;
}

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

/** Also writes the props type that the parent tooling reads. */
export function componentModule(
  host: LusiaHost,
  fileName: string,
  sink: VirtualSink,
): string | undefined {
  const text = sources.get(fileName)?.text ?? readComponent(fileName);
  if (text === undefined) return undefined;
  const childPath = `${fileName}.ts`;
  sink.set(childPath, componentSource(host, text));
  const shimPath = `${fileName}.d.ts`;
  sink.set(shimPath, componentShim(childPath));
  return shimPath;
}

export function componentSource(host: LusiaHost, text: string): string {
  const virtual = virtualScript(host, text);
  return `${virtual.text}${flowDeclarations(virtual.flowNames)}${propsDeclaration(host, text)}`;
}

function readComponent(fileName: string): string | undefined {
  try {
    return readFileSync(fileName, "utf8");
  } catch {
    return undefined;
  }
}

function scriptOf(host: LusiaHost, text: string): string {
  const section = host.parseSections
    .findSections(text)
    .find((candidate) => candidate.kind === "script");
  return section === undefined
    ? ""
    : text.slice(section.contentStart, section.contentEnd);
}

function componentShim(childPath: string): string {
  const specifier = `./${basename(childPath)}`;
  return [
    'import type { Component } from "lusiajs";',
    `import type { LusiaProps } from ${JSON.stringify(specifier)};`,
    "declare const component: Component & { readonly props: LusiaProps };",
    "export default component;",
  ].join("\n");
}

function propsDeclaration(host: LusiaHost, text: string): string {
  const script = scriptOf(host, text);
  const call = host.parseProps.findPropsCall(script);
  if (call === undefined) return "\nexport type LusiaProps = {};\n";
  const fields = call.names.length > 0 ? call.names.map((name) => JSON.stringify(name)).join(" | ") : "never";
  return [
    "",
    `const __PropsClass = ${script.slice(call.classStart, call.classEnd)};`,
    `export type LusiaProps = Partial<Pick<InstanceType<typeof __PropsClass>, ${fields}>>;`,
    "",
  ].join("\n");
}
