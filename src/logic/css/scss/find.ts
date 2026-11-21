import { basename } from "node:path";
import type { TextRange } from "lusia/editor/range.ts";
import type { CssLocation } from "../types.ts";
import type { ScssIndex, ScssMember } from "./types.ts";

export interface ScssMemberHit {
  member: ScssMember;
  /** The member token in the component. */
  range: TextRange;
}

export interface ScssToken {
  text: string;
  range: TextRange;
}

const TOKEN = /\$?[A-Za-z_][\w-]*/g;

export function scssTokenAt(
  content: string,
  contentStart: number,
  offset: number,
): ScssToken | undefined {
  const token = tokenAt(content, offset - contentStart);
  if (!token) return undefined;
  return {
    text: token.text,
    range: { start: contentStart + token.start, end: contentStart + token.end },
  };
}

export function scssMemberAt(
  index: ScssIndex,
  content: string,
  contentStart: number,
  offset: number,
): ScssMemberHit | undefined {
  const local = offset - contentStart;
  const token = tokenAt(content, local);
  if (!token) return undefined;
  const namespace = namespaceAt(content, token.start);
  const kinds = memberKinds(content, token, namespace);
  for (const kind of kinds) {
    const member = index.members.find(
      (item) => item.name === token.text && item.kind === kind && item.namespace === namespace,
    );
    if (member) {
      return {
        member,
        range: { start: contentStart + token.start, end: contentStart + token.end },
      };
    }
  }
  return undefined;
}

/** The members reached through a namespace, or the global ones when it is omitted. */
export function indexMembers(index: ScssIndex, namespace?: string): ScssMember[] {
  return index.members.filter((member) => member.namespace === namespace);
}

/** The ranges of the member's declaration and uses in a file. */
export function scssOccurrences(member: ScssMember, text: string, by: number): TextRange[] {
  return nameRanges(member, text).map(([start, end]) => ({ start: start + by, end: end + by }));
}

export function memberHover(member: ScssMember): string {
  return ["```scss", member.detail, "```", "", `From \`${basename(member.path)}\``].join("\n");
}

export function memberDefinition(member: ScssMember): CssLocation {
  return {
    path: member.path,
    range: { start: member.offset, end: member.offset + member.name.length },
  };
}

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenAt(content: string, local: number): Token | undefined {
  const token = new RegExp(TOKEN.source, "g");
  let match = token.exec(content);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    if (local >= start && local <= end) return { text: match[0], start, end };
    if (start > local) return undefined;
    match = token.exec(content);
  }
  return undefined;
}

function namespaceAt(content: string, start: number): string | undefined {
  return /([A-Za-z_][\w-]*)\.$/.exec(content.slice(0, start))?.[1];
}

function memberKinds(
  content: string,
  token: Token,
  namespace: string | undefined,
): ScssMember["kind"][] {
  if (token.text.startsWith("$")) return ["variable"];
  const before = content.slice(0, token.start);
  if (/@include\s+(?:[A-Za-z_][\w-]*\.)?$/.test(before)) return ["mixin"];
  if (namespace && content[token.end] === "(") return ["function"];
  return namespace ? ["mixin", "function"] : [];
}

function nameRanges(member: ScssMember, text: string): Array<[number, number]> {
  const name = escapeRegExp(member.name);
  if (member.kind === "variable") {
    return wholeRanges(new RegExp(`${name}(?![\\w-])`, "g"), text);
  }
  if (member.kind === "mixin") {
    const include = new RegExp(
      `@(?:include|mixin)\\s+(?:[A-Za-z_][\\w-]*\\.)?(${name})(?![\\w-])`,
      "g",
    );
    return captureRanges(include, text);
  }
  const declaration = captureRanges(new RegExp(`@function\\s+(${name})(?![\\w-])`, "g"), text);
  const calls = captureRanges(new RegExp(`(?:^|[^\\w-])(${name})\\s*\\(`, "g"), text);
  return dedupeRanges([...declaration, ...calls]);
}

function wholeRanges(pattern: RegExp, text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let match = pattern.exec(text);
  while (match) {
    ranges.push([match.index, match.index + match[0].length]);
    match = pattern.exec(text);
  }
  return ranges;
}

function captureRanges(pattern: RegExp, text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let match = pattern.exec(text);
  while (match) {
    const offset = match[0].length - (match[1]?.length ?? 0);
    ranges.push([match.index + offset, match.index + offset + (match[1]?.length ?? 0)]);
    match = pattern.exec(text);
  }
  return ranges;
}

function dedupeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const seen = new Set<number>();
  return ranges
    .sort((a, b) => a[0] - b[0])
    .filter(([start]) => {
      if (seen.has(start)) return false;
      seen.add(start);
      return true;
    });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
