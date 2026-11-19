import { enumNameItem } from "./enum-members.ts";
import { expressionEnd } from "./format-expressions.ts";
import type { CompletionItemData, ScriptItem } from "./completion-data.ts";

const ANIMATE_OPEN = "animate={";

const FIELD_ITEMS: CompletionItemData[] = [
  { label: "animation", kind: "property", insertText: "animation: $1", snippet: true, detail: "Keyframes to play" },
  { label: "active", kind: "property", insertText: "active: $1", snippet: true, detail: "Trigger: ACTIVE member or a store (default ACTIVE.IN)" },
  { label: "control", kind: "property", insertText: "control: $1", snippet: true, detail: "A controller() that plays, reverses, stops or seeks" },
  { label: "once", kind: "property", insertText: "once: true", snippet: false, detail: "Play forward only once" },
  { label: "more", kind: "property", insertText: "more: { $1 }", snippet: true, detail: "Trigger options: VIEW margin, amount, reverse; HOVER inDelay, outDelay, out, outDuration; SCROLL start, end, follow, part" },
  { label: "keep", kind: "property", insertText: "keep: false", snippet: false, detail: "Remove the inline styles when a play ends (default true)" },
  { label: "duration", kind: "property", insertText: "duration: $1", snippet: true, detail: "Length of one play, in ms (default 300)" },
  { label: "delay", kind: "property", insertText: "delay: $1", snippet: true, detail: "Wait before each forward play, in ms" },
  { label: "loop", kind: "property", insertText: "loop: $1", snippet: true, detail: "true repeats forever, or a count" },
  { label: "backAndForth", kind: "property", insertText: "backAndForth: true", snippet: false, detail: "With loop: each repeat plays 0 to 1, then back to 0" },
];

/** The keys of `more` for each trigger. Each trigger takes only its own. */
const MORE_FIELDS: Record<string, CompletionItemData[]> = {
  VIEW: [
    { label: "margin", kind: "property", insertText: "margin: $1", snippet: true, detail: "How far inside the screen edge, in px or a CSS length such as \"10%\" (default 0)" },
    { label: "amount", kind: "property", insertText: "amount: $1", snippet: true, detail: "Share of the element that must be visible, 0 to 1 (default 0.15)" },
    { label: "reverse", kind: "property", insertText: "reverse: true", snippet: false, detail: "Play back out when it leaves the view, and again on re-entry" },
  ],
  HOVER: [
    { label: "inDelay", kind: "property", insertText: "inDelay: $1", snippet: true, detail: "Ms to wait after pointer enter before playing in (default 0)" },
    { label: "outDelay", kind: "property", insertText: "outDelay: $1", snippet: true, detail: "Ms to wait after pointer leave before playing back (default 0)" },
    { label: "out", kind: "property", insertText: "out: { $1 }", snippet: true, detail: "Keyframes for leaving. Without it, the in plays backward" },
    { label: "outDuration", kind: "property", insertText: "outDuration: $1", snippet: true, detail: "Ms for the way out (default: the item duration). Needs out" },
  ],
  SCROLL: [
    { label: "start", kind: "property", insertText: "start: $1", snippet: true, detail: "Line where the progress is 0, from the bottom edge: 0 to 1 (default 0)" },
    { label: "end", kind: "property", insertText: "end: $1", snippet: true, detail: "Line where the progress is 1, from the bottom edge: 0 to 1 (default 1). Not with follow" },
    { label: "follow", kind: "property", insertText: "follow: $1", snippet: true, detail: "Store of the tall element that drives the progress, such as one set by bind-element. Not with start or end" },
    { label: "part", kind: "property", insertText: "part: [$1]", snippet: true, detail: "Slice of the progress that this item plays: [from, to], 0 to 1" },
  ],
};

/**
 * Completions inside `animate={...}`: the item keys of an AnimateItem, the
 * ACTIVE enum after `active:`, or the `more` keys of the item's trigger.
 * Undefined when the cursor is elsewhere.
 */
export function animateFieldsAt(text: string, offset: number): ScriptItem[] | undefined {
  const open = animateExpressionOpen(text, offset);
  if (open === -1) return undefined;
  const typed = text.slice(open, offset);
  if (ACTIVE_VALUE.test(typed)) return enumNameItem("ACTIVE");
  if (isMoreKeyPosition(typed)) return moreFieldsFor(typed);
  return isItemKeyPosition(typed) ? FIELD_ITEMS : undefined;
}

/** True when the cursor is inside an animate expression, for hover. */
export function isInAnimate(text: string, offset: number): boolean {
  return animateExpressionOpen(text, offset) !== -1;
}

const ACTIVE_VALUE = /\bactive\s*:\s*[\w$]*$/;
const MORE_OPEN = /\bmore\s*:\s*$/;
const KEY_POSITION = /[{,]\s*[\w$]*$/;
const ACTIVE_NAMES = /\bactive\s*:\s*ACTIVE\.([A-Z]+)/g;

/** True at a key of a `more: {...}` object. */
function isMoreKeyPosition(typed: string): boolean {
  const stack = openersOf(typed);
  if (stack[stack.length - 1] !== "{") return false;
  const before = typed.slice(0, typed.lastIndexOf("{"));
  return MORE_OPEN.test(before) && KEY_POSITION.test(typed);
}

/** The `more` keys for the last `active: ACTIVE.X` before the cursor. Undefined when no trigger is set yet. */
function moreFieldsFor(typed: string): CompletionItemData[] | undefined {
  const names = [...typed.matchAll(ACTIVE_NAMES)];
  const trigger = names[names.length - 1]?.[1];
  return trigger === undefined ? undefined : MORE_FIELDS[trigger];
}

/** The index of the `{` that opens the expression, when the cursor is still inside it. */
function animateExpressionOpen(text: string, offset: number): number {
  const start = text.lastIndexOf(ANIMATE_OPEN, offset);
  if (start === -1) return -1;
  const open = start + ANIMATE_OPEN.length - 1;
  const end = expressionEnd(text, open);
  return end === -1 || end >= offset ? open : -1;
}

/**
 * True at a key of an item object: `{...}` directly, or inside `[...]`, with
 * the cursor after `{` or `,`. Keyframes objects (keys start with a number) are skipped.
 */
function isItemKeyPosition(typed: string): boolean {
  const stack = openersOf(typed);
  const inner = stack[stack.length - 1];
  const valid = stack.length === 2 || (stack.length === 3 && stack[1] === "[");
  if (inner !== "{" || !valid) return false;
  const body = typed.slice(typed.lastIndexOf("{") + 1);
  return !/^\s*\d/.test(body) && KEY_POSITION.test(typed);
}

/** The brackets still open at the end of `typed`, outermost first. Strings are skipped. */
function openersOf(typed: string): string[] {
  const stack: string[] = [];
  let quote: string | undefined;
  for (const ch of typed) {
    if (quote) {
      if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{" || ch === "[" || ch === "(") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]" || ch === ")") {
      stack.pop();
    }
  }
  return stack;
}
