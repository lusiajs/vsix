import type { ApiEntry, ApiMember } from "../../../../reference/api.ts";
import { findEnum } from "./api-lookup.ts";
import type { ScriptItem } from "./completion-data.ts";

/** A dotted path that ends in `.`, such as `EASE.STYLE.` or `EASE.`. The path is group 1. */
const MEMBER_ACCESS = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.[\w$]*$/;
const WORD_CHAR = /[\w$]/;
const WINDOW = 64;

/**
 * Completes the members of an enum after `NAME.`, or after a nested name such as `EASE.STYLE.`.
 * Each member carries the enum as its import, so picking one adds the import.
 */
export function enumMembersAt(text: string, offset: number): ScriptItem[] | undefined {
  const head = text.slice(Math.max(0, offset - WINDOW), offset);
  const access = MEMBER_ACCESS.exec(head);
  if (!access) return undefined;
  const [root, ...names] = (access[1] ?? "").split(".");
  const entry = findEnum(root ?? "");
  const members = entry ? membersAt(entry.members, names) : undefined;
  if (!entry || !members) return undefined;
  return members.map((member) => ({
    label: member.name,
    kind: "property",
    insertText: member.name,
    snippet: false,
    detail: member.summary,
    importName: entry.name,
  }));
}

/** The enum that a member name belongs to, such as EASE for the word QUART in `EASE.STYLE.QUART`. */
export function enumOwnerAt(text: string, offset: number): ApiEntry | undefined {
  const start = wordStart(text, offset);
  const access = MEMBER_ACCESS.exec(text.slice(Math.max(0, start - WINDOW), start));
  if (!access) return undefined;
  return findEnum((access[1] ?? "").split(".")[0] ?? "");
}

/** The enum name itself, as a completion that imports it. */
export function enumNameItem(name: string): ScriptItem[] {
  const entry = findEnum(name);
  return entry
    ? [
        {
          label: entry.name,
          kind: "variable",
          insertText: entry.name,
          snippet: false,
          detail: entry.summary,
          importName: entry.name,
        },
      ]
    : [];
}

function membersAt(members: ApiMember[] | undefined, names: string[]): ApiMember[] | undefined {
  if (!members) return undefined;
  const [name, ...rest] = names;
  if (name === undefined) return members;
  return membersAt(members.find((member) => member.name === name)?.members, rest);
}

function wordStart(text: string, offset: number): number {
  let start = offset;
  while (start > 0 && WORD_CHAR.test(text.charAt(start - 1))) start--;
  return start;
}
