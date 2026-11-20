import type { ApiEntry } from "../../../../reference/api.ts";
import { findApiById, findScriptApi } from "./api-lookup.ts";
import type { PropLookup } from "./completions.ts";
import { cssKeyAt, isInAnimate } from "./animate-fields.ts";
import { enumOwnerAt } from "./enum-members.ts";
import { findComponentImport } from "./imports.ts";
import type { PropDef } from "./props.ts";
import { regionAt } from "./regions.ts";
import { openTagAt, tagNameAt, type OpenTag } from "./tag.ts";
import { attributeNameAt, wordAt } from "./word.ts";

export type HoverResult =
  | { kind: "api"; entry: ApiEntry }
  | { kind: "component"; name: string; props: PropDef[] }
  | { kind: "css"; name: string };

const STYLE_TOKENS: Array<[string, string]> = [
  ["@scoped", "scoped"],
  ["@global", "global"],
  [":global(", "inline-global"],
];

const STYLE_TAG_IDS: Record<string, string> = { scoped: "style-scoped", global: "style-global" };

export function hoverAt(
  text: string,
  offset: number,
  propsOf: PropLookup,
): HoverResult | undefined {
  const region = regionAt(text, offset);
  if (region.section?.kind === "script") return scriptHover(text, offset);
  if (region.section?.kind === "style") return styleHover(text, offset);
  return markupHover(text, offset, propsOf);
}

function scriptHover(text: string, offset: number): HoverResult | undefined {
  const entry = findScriptApi(wordAt(text, offset)) ?? enumOwnerAt(text, offset);
  return entry ? { kind: "api", entry } : undefined;
}

function styleHover(text: string, offset: number): HoverResult | undefined {
  const id = styleTokenAt(text, offset);
  const entry = id ? findApiById(id) : undefined;
  return entry ? { kind: "api", entry } : undefined;
}

function markupHover(text: string, offset: number, propsOf: PropLookup): HoverResult | undefined {
  const tag = openTagAt(text, offset);
  if (tag?.name === "style") return styleTagHover(text, offset);
  return (
    flowTagHover(text, offset) ??
    plainAttributeHover(text, offset, tag) ??
    animateMoreHover(text, offset) ??
    cssHover(text, offset) ??
    componentHover(text, offset, propsOf)
  );
}

/** Hover on the `more` key inside an animate object. */
function animateMoreHover(text: string, offset: number): HoverResult | undefined {
  if (wordAt(text, offset) !== "more" || !isInAnimate(text, offset)) return undefined;
  return apiResult("animate-more");
}

const FLOW_TAG_IDS: Record<string, string> = {
  IF: "if",
  ELSEIF: "elseif",
  ELSE: "else",
  EACH: "each",
  FOR: "for",
  CONTENT: "content",
  HTML: "html",
};

const FLOW_TAG_NAME = /<\/?(IF|ELSEIF|ELSE|EACH|FOR|CONTENT|HTML)(?=[\s/>])/g;

/** Hover on a flow tag's name, in its opening or closing tag. */
function flowTagHover(text: string, offset: number): HoverResult | undefined {
  for (const match of text.matchAll(FLOW_TAG_NAME)) {
    const name = match[1] ?? "";
    const nameStart = match.index + match[0].length - name.length;
    if (offset >= nameStart && offset <= nameStart + name.length)
      return apiResult(FLOW_TAG_IDS[name]);
  }
  return undefined;
}

/** Hover for `animate`, `on<event>`, `bind`, `bind-<prop>` and `bind-element` on a plain tag. */
function plainAttributeHover(
  text: string,
  offset: number,
  tag: OpenTag | undefined,
): HoverResult | undefined {
  if (!tag || findComponentImport(text, tag.name)) return undefined;
  return apiResult(attributeHoverId(attributeNameAt(text, offset)));
}

function attributeHoverId(name: string): string | undefined {
  if (name === "animate" || name === "bind" || name === "bind-element") return name;
  if (name.startsWith("bind-")) return "bind-prop";
  if (/^on[a-z]+$/.test(name)) return "event";
  return undefined;
}

function apiResult(id: string | undefined): HoverResult | undefined {
  const entry = id ? findApiById(id) : undefined;
  return entry ? { kind: "api", entry } : undefined;
}

function componentHover(
  text: string,
  offset: number,
  propsOf: PropLookup,
): HoverResult | undefined {
  const componentTag = tagNameAt(text, offset);
  if (!componentTag || !findComponentImport(text, componentTag.name)) return undefined;
  return { kind: "component", name: componentTag.name, props: propsOf(componentTag.name) };
}

function styleTagHover(text: string, offset: number): HoverResult | undefined {
  const word = wordAt(text, offset);
  const entry = findApiById(STYLE_TAG_IDS[word] ?? "style");
  return entry ? { kind: "api", entry } : undefined;
}

/** The api id of a style token (`@scoped`, `@global`, `:global(`) under the cursor, if any. */
function styleTokenAt(text: string, offset: number): string | undefined {
  const lineStart = offset > 0 ? text.lastIndexOf("\n", offset - 1) + 1 : 0;
  const lineEndIndex = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEndIndex === -1 ? text.length : lineEndIndex);
  for (const [token, id] of STYLE_TOKENS) {
    if (tokenCovers(line, token, offset - lineStart)) return id;
  }
  return undefined;
}

function tokenCovers(line: string, token: string, column: number): boolean {
  let at = line.indexOf(token);
  while (at !== -1) {
    if (column >= at && column <= at + token.length) return true;
    at = line.indexOf(token, at + 1);
  }
  return false;
}

/** Hover on a style property written as a key of a keyframe. */
function cssHover(text: string, offset: number): HoverResult | undefined {
  const name = cssKeyAt(text, offset);
  return name === undefined ? undefined : { kind: "css", name };
}
