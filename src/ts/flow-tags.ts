import type { Section } from "lusiajs/language/parse/sections.ts";
import { expressionEnd, tagEnd } from "./scan.ts";

export interface FlowName {
  name: string;
  kind: "item" | "index" | "number";
  /** The list expression of an item name. */
  list?: string;
}

interface TagBody {
  list?: string;
  attrs: Map<string, string>;
}

const OPEN_TAG = /<(EACH|FOR)(?=[\s/>])/g;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** The names the flow tags introduce, in document order and without duplicates. */
export function collectFlowNames(
  source: string,
  sections: Section[],
): FlowName[] {
  const found = new Map<string, FlowName>();
  for (const match of masked(source, sections).matchAll(OPEN_TAG)) {
    const name = match[1] as "EACH" | "FOR";
    const start = match.index;
    const end = tagEnd(source, start);
    if (end === -1) break;
    addFlow(found, name, readTag(source, start + name.length + 1, end));
  }
  return [...found.values()];
}

function masked(source: string, sections: Section[]): string {
  if (sections.length === 0) return source;
  const chars = source.split("");
  for (const section of sections) {
    for (let i = section.openStart; i < section.end; i++) {
      const ch = source.charAt(i);
      if (ch !== "\n" && ch !== "\r") chars[i] = " ";
    }
  }
  return chars.join("");
}

function addFlow(
  found: Map<string, FlowName>,
  tag: "EACH" | "FOR",
  body: TagBody,
): void {
  if (tag === "FOR") {
    if (body.list !== undefined && IDENTIFIER.test(body.list))
      remember(found, { name: body.list, kind: "number" });
    return;
  }
  const item = body.attrs.get("as");
  if (item !== undefined && IDENTIFIER.test(item))
    remember(found, { name: item, kind: "item", list: body.list });
  const index = body.attrs.get("index");
  if (index !== undefined && IDENTIFIER.test(index))
    remember(found, { name: index, kind: "index" });
}

function remember(found: Map<string, FlowName>, flow: FlowName): void {
  if (!found.has(flow.name)) found.set(flow.name, flow);
}

function readTag(source: string, from: number, to: number): TagBody {
  const attrs = new Map<string, string>();
  let i = skipSpace(source, from);
  let list: string | undefined;
  if (source.charAt(i) === "{") {
    const { code, next } = readCode(source, i, to);
    list = code;
    i = next;
  }
  while (i < to) {
    i = skipSpace(source, i);
    if (i >= to) break;
    const nameStart = i;
    while (i < to && !/[\s=/>]/.test(source.charAt(i))) i++;
    const name = source.slice(nameStart, i);
    if (name === "") {
      i++;
      continue;
    }
    i = skipSpace(source, i);
    if (source.charAt(i) !== "=") {
      attrs.set(name, "");
      continue;
    }
    i = skipSpace(source, i + 1);
    const value = readValue(source, i, to);
    i = value.next;
    attrs.set(name, value.code);
  }
  return { list, attrs };
}

function readValue(
  source: string,
  from: number,
  to: number,
): { code: string; next: number } {
  const ch = source.charAt(from);
  if (ch === "{") return readCode(source, from, to);
  if (ch === '"' || ch === "'") {
    const end = source.indexOf(ch, from + 1);
    const stop = end === -1 || end > to ? to : end;
    return {
      code: unwrap(source.slice(from + 1, stop)),
      next: Math.min(stop + 1, to),
    };
  }
  let i = from;
  while (i < to && !/\s/.test(source.charAt(i))) i++;
  return { code: source.slice(from, i), next: i };
}

function readCode(
  source: string,
  open: number,
  to: number,
): { code: string; next: number } {
  const end = expressionEnd(source, open);
  const stop = end === -1 || end > to ? to : end;
  return {
    code: source.slice(open + 1, stop).trim(),
    next: Math.min(stop + 1, to),
  };
}

function unwrap(value: string): string {
  const match = /^\s*\{([\s\S]*)\}\s*$/.exec(value);
  return (match?.[1] ?? value).trim();
}

function skipSpace(source: string, from: number): number {
  let i = from;
  while (i < source.length && /\s/.test(source.charAt(i))) i++;
  return i;
}
