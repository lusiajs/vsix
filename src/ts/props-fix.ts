import type { PropsCall } from "lusiajs/language/parse/props.ts";
import type { LusiaHost } from "../host/types.ts";

export interface PropInsert {
  /** Document offset. */
  offset: number;
  text: string;
}

const UNDEFINED_NAME = /^Cannot find name '([^']+)'\./;
const MISSING_PROPERTY = /^Property '([^']+)' does not exist on type/;

/** The prop a message says is missing, such as `size`. */
export function missingPropName(message: string): string | undefined {
  return UNDEFINED_NAME.exec(message)?.[1] ?? MISSING_PROPERTY.exec(message)?.[1];
}

/** Inserts `name = undefined;` into the props class, and `name` into a destructure list. Empty when there is no props call. */
export function addPropInserts(host: LusiaHost, text: string, name: string): PropInsert[] {
  const section = host.parseSections
    .findSections(text)
    .find((candidate) => candidate.kind === "script");
  if (section === undefined) return [];
  const script = text.slice(section.contentStart, section.contentEnd);
  const call = host.parseProps.findPropsCall(script);
  if (call === undefined) return [];
  const inserts = [classInsert(section.contentStart, call, name)];
  const destructure = destructureInsert(section.contentStart, script, call, name);
  if (destructure) inserts.push(destructure);
  return inserts;
}

function classInsert(base: number, call: PropsCall, name: string): PropInsert {
  return { offset: base + call.classEnd - 1, text: `  ${name} = undefined;\n` };
}

function destructureInsert(
  base: number,
  script: string,
  call: PropsCall,
  name: string,
): PropInsert | undefined {
  if (call.binding.kind !== "destructure" || call.binding.names.includes(name)) return undefined;
  const head = script.slice(call.start, call.classStart);
  const before = head.slice(0, head.indexOf("}")).trimEnd();
  const text = before.endsWith("{") ? ` ${name} ` : `, ${name}`;
  return { offset: base + call.start + before.length, text };
}
