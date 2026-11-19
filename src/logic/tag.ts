import { regionAt } from "./regions.ts";

export interface OpenTag {
  name: string;
  start: number;
  nameStart: number;
  nameEnd: number;
}

const TAG_START = /<([A-Za-z][\w.-]*)/y;
const TAG_NAME_TYPING = /<[\w.-]*$/;

/** The start tag that the cursor is inside, or undefined. */
export function openTagAt(text: string, offset: number): OpenTag | undefined {
  if (offset <= 0) return undefined;
  const start = text.lastIndexOf("<", offset - 1);
  if (start === -1 || hasClosed(text.slice(start, offset))) return undefined;
  TAG_START.lastIndex = start;
  const match = TAG_START.exec(text);
  if (!match) return undefined;
  const name = match[1] ?? "";
  return { name, start, nameStart: start + 1, nameEnd: start + 1 + name.length };
}

/** The start tag whose name the cursor is on, in markup only. */
export function tagNameAt(text: string, offset: number): OpenTag | undefined {
  if (regionAt(text, offset).kind !== "markup") return undefined;
  const tag = openTagAt(text, offset);
  if (!tag || offset < tag.nameStart || offset > tag.nameEnd) return undefined;
  return tag;
}

/** True while the user is typing a tag name right after `<`. */
export function isTagNameTyping(text: string, offset: number): boolean {
  return TAG_NAME_TYPING.test(text.slice(0, offset));
}

// A `>` inside `{...}` belongs to an expression, not to the tag.
function hasClosed(head: string): boolean {
  let depth = 0;
  for (const ch of head.slice(1)) {
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ">" && depth === 0) return true;
  }
  return false;
}
