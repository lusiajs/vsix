import { findEnum } from "./api-lookup.ts";
import type { ScriptItem } from "./completion-data.ts";

const MEMBER_ACCESS = /([A-Za-z_$][\w$]*)\.[\w$]*$/;
const WINDOW = 64;

/**
 * Completes the members of an enum after `NAME.`, such as `TRANSITION.`.
 * Each member carries the enum as its import, so picking one adds the import.
 */
export function enumMembersAt(text: string, offset: number): ScriptItem[] | undefined {
  const head = text.slice(Math.max(0, offset - WINDOW), offset);
  const access = MEMBER_ACCESS.exec(head);
  const entry = access ? findEnum(access[1] ?? "") : undefined;
  if (!entry?.members) return undefined;
  return entry.members.map((member) => ({
    label: member.name,
    kind: "property",
    insertText: member.name,
    snippet: false,
    detail: member.summary,
    importName: entry.name,
  }));
}

/** The enum name itself, as a completion that imports it. */
export function enumNameItem(name: string): ScriptItem[] {
  const entry = findEnum(name);
  return entry ? [{ label: entry.name, kind: "variable", insertText: entry.name, snippet: false, detail: entry.summary, importName: entry.name }] : [];
}
