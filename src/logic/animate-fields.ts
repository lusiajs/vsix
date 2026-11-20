import { CSS_PROPERTIES } from "./css-properties.ts";
import { enumNameItem } from "./enum-members.ts";
import { expressionEnd } from "./format-expressions.ts";
import type { CompletionItemData, ScriptItem } from "./completion-data.ts";

const ANIMATE_OPEN = "animate={";

const FIELD_ITEMS: CompletionItemData[] = [
  {
    label: "style",
    kind: "property",
    insertText: "style: $1",
    snippet: true,
    detail: "Keyframes to play",
  },
  {
    label: "when",
    kind: "property",
    insertText: "when: $1",
    snippet: true,
    detail: "Trigger: WHEN member or a store (default WHEN.ATTACH)",
  },
  {
    label: "control",
    kind: "property",
    insertText: "control: $1",
    snippet: true,
    detail: "A controller() that plays, reverses, stops or seeks",
  },
  {
    label: "once",
    kind: "property",
    insertText: "once: true",
    snippet: false,
    detail: "Play forward only once",
  },
  {
    label: "more",
    kind: "property",
    insertText: "more: { $1 }",
    snippet: true,
    detail:
      "Trigger options: VIEW margin, amount, reverse; HOVER inDelay, outDelay, out, outDuration; SCROLL start, end, follow, part",
  },
  {
    label: "midway",
    kind: "property",
    insertText: "midway: $1",
    snippet: true,
    detail:
      "What a new play does while one runs: MIDWAY member, or { play, turn, turnDuration, turnStyle, turnEase }",
  },
  {
    label: "keep",
    kind: "property",
    insertText: "keep: false",
    snippet: false,
    detail: "Remove the inline styles when a play ends (default true)",
  },
  {
    label: "duration",
    kind: "property",
    insertText: "duration: $1",
    snippet: true,
    detail: "Length of one play, in ms (default 300)",
  },
  {
    label: "delay",
    kind: "property",
    insertText: "delay: $1",
    snippet: true,
    detail: "Wait before each forward play, in ms",
  },
  {
    label: "loop",
    kind: "property",
    insertText: "loop: $1",
    snippet: true,
    detail: "true repeats forever, or a count",
  },
  {
    label: "backAndForth",
    kind: "property",
    insertText: "backAndForth: true",
    snippet: false,
    detail: "With loop: each repeat plays 0 to 1, then back to 0",
  },
];

/** The keys of `more` for each trigger. Each trigger takes only its own. */
const MORE_FIELDS: Record<string, CompletionItemData[]> = {
  VIEW: [
    {
      label: "margin",
      kind: "property",
      insertText: "margin: $1",
      snippet: true,
      detail: 'How far inside the screen edge, in px or a CSS length such as "10%" (default 0)',
    },
    {
      label: "amount",
      kind: "property",
      insertText: "amount: $1",
      snippet: true,
      detail: "Share of the element that must be visible, 0 to 1 (default 0.15)",
    },
    {
      label: "reverse",
      kind: "property",
      insertText: "reverse: true",
      snippet: false,
      detail: "Play back out when it leaves the view, and again on re-entry",
    },
  ],
  HOVER: [
    {
      label: "inDelay",
      kind: "property",
      insertText: "inDelay: $1",
      snippet: true,
      detail: "Ms to wait after pointer enter before playing in (default 0)",
    },
    {
      label: "outDelay",
      kind: "property",
      insertText: "outDelay: $1",
      snippet: true,
      detail: "Ms to wait after pointer leave before playing back (default 0)",
    },
    {
      label: "out",
      kind: "property",
      insertText: "out: { $1 }",
      snippet: true,
      detail: "Keyframes for leaving. Without it, the in plays backward",
    },
    {
      label: "outDuration",
      kind: "property",
      insertText: "outDuration: $1",
      snippet: true,
      detail: "Ms for the way out (default: the item duration). Needs out",
    },
  ],
  SCROLL: [
    {
      label: "start",
      kind: "property",
      insertText: "start: $1",
      snippet: true,
      detail:
        "Where the progress is 0: SCROLL_AT member, or { element, window } with EDGE (default SCROLL_AT.ENTER)",
    },
    {
      label: "end",
      kind: "property",
      insertText: "end: $1",
      snippet: true,
      detail:
        "Where the progress is 1: SCROLL_AT member, or { element, window } with EDGE (default SCROLL_AT.LEAVE). Not with follow",
    },
    {
      label: "follow",
      kind: "property",
      insertText: "follow: $1",
      snippet: true,
      detail:
        "Store of the tall element that drives the progress, such as one set by bind-element. Not with start or end",
    },
    {
      label: "part",
      kind: "property",
      insertText: "part: [$1]",
      snippet: true,
      detail: "Slice of the progress that this item plays: [from, to], 0 to 1",
    },
  ],
};

/** The keys of a `midway: { ... }` object. */
const MIDWAY_FIELDS: CompletionItemData[] = [
  {
    label: "play",
    kind: "property",
    insertText: "play: $1",
    snippet: true,
    detail: "MIDWAY member: what a new play does while one runs (default MIDWAY.TURN)",
  },
  {
    label: "turn",
    kind: "property",
    insertText: "turn: $1",
    snippet: true,
    detail: "TURN member or a function: how the motion changes direction (default TURN.SUDDEN)",
  },
  {
    label: "turnDuration",
    kind: "property",
    insertText: "turnDuration: $1",
    snippet: true,
    detail: "Length of the change in ms (default 200)",
  },
  {
    label: "turnStyle",
    kind: "property",
    insertText: "turnStyle: $1",
    snippet: true,
    detail: "EASE.STYLE member for the blend (default EASE.STYLE.CUBIC)",
  },
  {
    label: "turnEase",
    kind: "property",
    insertText: "turnEase: $1",
    snippet: true,
    detail: "EASE member for the blend (default EASE.INOUT)",
  },
];

/** The style properties of a keyframe object, in camelCase, as the DOM names them. */
const CSS_FIELDS: CompletionItemData[] = CSS_PROPERTIES.map((name) => ({
  label: name,
  kind: "property",
  insertText: `${name}: $1`,
  snippet: true,
  detail: "CSS style property",
}));

const CSS_NAMES: ReadonlySet<string> = new Set(CSS_PROPERTIES);

/** The keys of a keyframes object. `default` sets the easing for keys that do not set their own. */
const KEYFRAMES_FIELDS: CompletionItemData[] = [
  {
    label: "default",
    kind: "property",
    insertText: "default: [$1]",
    snippet: true,
    detail:
      "Easing for keys that do not set their own: [EASE.STYLE.x, EASE.y], [EASE.STYLE.x] or [EASE.y]",
  },
];

/**
 * Completions inside `animate={...}`: the item keys of an AnimateItem, the
 * WHEN enum after `when:`, the MIDWAY and TURN enums, or the keys of
 * `more` and `midway` objects. Undefined when the cursor is elsewhere.
 */
export function animateFieldsAt(text: string, offset: number): ScriptItem[] | undefined {
  const open = animateExpressionOpen(text, offset);
  if (open === -1) return undefined;
  const typed = text.slice(open, offset);
  if (WHEN_VALUE.test(typed)) return enumNameItem("WHEN");
  if (MIDWAY_VALUE.test(typed)) return enumNameItem("MIDWAY");
  if (TURN_VALUE.test(typed)) return enumNameItem("TURN");
  if (isObjectKeyPosition(typed, MORE_OPEN)) return moreFieldsFor(typed);
  if (isObjectKeyPosition(typed, MIDWAY_OPEN)) return MIDWAY_FIELDS;
  if (isObjectKeyPosition(typed, STYLE_OPEN)) return KEYFRAMES_FIELDS;
  if (isCssKeyPosition(typed)) return CSS_FIELDS;
  return isItemKeyPosition(typed) ? FIELD_ITEMS : undefined;
}

/** True when the cursor is inside an animate expression, for hover. */
export function isInAnimate(text: string, offset: number): boolean {
  return animateExpressionOpen(text, offset) !== -1;
}

/** The style property under the cursor when it is a key of a keyframe css object, such as `opacity` in `0: { opacity }`. */
export function cssKeyAt(text: string, offset: number): string | undefined {
  let start = offset;
  while (start > 0 && WORD_CHAR.test(text.charAt(start - 1))) start--;
  let end = offset;
  while (end < text.length && WORD_CHAR.test(text.charAt(end))) end++;
  const name = text.slice(start, end);
  if (!CSS_NAMES.has(name)) return undefined;
  const open = animateExpressionOpen(text, start);
  if (open === -1 || !isCssKeyPosition(text.slice(open, start))) return undefined;
  return name;
}

const WORD_CHAR = /[\w$]/;
/** A `{` that is the value of a numeric key: `0: {`, or `1: [EASE.OUT, {` with the ease first. */
const CSS_OPEN = /\b\d+(?:\.\d+)?\s*:\s*(?:\[[^[\]{}]*,?\s*)?$/;

function isCssKeyPosition(typed: string): boolean {
  const stack = openersOf(typed);
  if (stack[stack.length - 1] !== "{") return false;
  const before = typed.slice(0, typed.lastIndexOf("{"));
  return CSS_OPEN.test(before) && KEY_POSITION.test(typed);
}

const WHEN_VALUE = /\bwhen\s*:\s*[\w$]*$/;
const MIDWAY_VALUE = /\bmidway\s*:\s*[\w$]*$/;
const TURN_VALUE = /\bturn\s*:\s*[\w$]*$/;
const MORE_OPEN = /\bmore\s*:\s*$/;
const MIDWAY_OPEN = /\bmidway\s*:\s*$/;
const STYLE_OPEN = /\bstyle\s*:\s*$/;
const KEY_POSITION = /[{,]\s*[\w$]*$/;
const WHEN_NAMES = /\bwhen\s*:\s*WHEN\.([A-Z_]+)/g;

/** True at a key of an object that follows `opener`, such as `more: {...}`. */
function isObjectKeyPosition(typed: string, opener: RegExp): boolean {
  const stack = openersOf(typed);
  if (stack[stack.length - 1] !== "{") return false;
  const before = typed.slice(0, typed.lastIndexOf("{"));
  return opener.test(before) && KEY_POSITION.test(typed);
}

/** The `more` keys for the last `when: WHEN.X` before the cursor. Undefined when no trigger is set yet. */
function moreFieldsFor(typed: string): CompletionItemData[] | undefined {
  const names = [...typed.matchAll(WHEN_NAMES)];
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
