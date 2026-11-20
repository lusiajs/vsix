import { FORM_TAGS } from "../../../../src/compiler/template/bind.ts";
import { findApiById } from "./api-lookup.ts";
import { MOTION_ATTRIBUTE_ITEMS, type CompletionItemData } from "./completion-data.ts";

const FLOW_TAGS: Record<string, string> = {
  IF: "Show when true",
  ELSEIF: "Another branch of IF",
  ELSE: "Shown when no branch is true",
  EACH: "Repeat for each item",
  FOR: "Repeat for a range of numbers",
  CONTENT: "Children given to this component",
  HTML: "Insert an expression as HTML",
};

const FLOW_TAG_BODIES: Record<string, string> = {
  IF: "IF {$1}>\n\t$0\n</IF>",
  ELSEIF: "ELSEIF {$1}>\n\t$0\n</ELSEIF>",
  ELSE: "ELSE>\n\t$0\n</ELSE>",
  EACH: "EACH {$1} as={$2} key={$3}>\n\t$0\n</EACH>",
  FOR: "FOR {$1} from={$2} to={$3}>\n\t$0\n</FOR>",
  CONTENT: "CONTENT />",
  HTML: "HTML>{$1}</HTML>",
};

const EVENT_NAMES = [
  "onclick",
  "oninput",
  "onchange",
  "onsubmit",
  "onkeydown",
  "onfocus",
  "onblur",
];

const EACH_ATTRIBUTES = ["as", "index", "key"];
const FOR_ATTRIBUTES = ["from", "to", "step"];

export function isFlowTag(name: string): boolean {
  return name in FLOW_TAGS;
}

/** The block tags, offered after `<`. */
export const FLOW_TAG_ITEMS: CompletionItemData[] = Object.keys(FLOW_TAGS).map((name) => ({
  label: name,
  kind: "keyword",
  insertText: FLOW_TAG_BODIES[name]!,
  snippet: true,
  detail: FLOW_TAGS[name],
}));

/** The attributes a flow tag takes, for completion inside its start tag. */
export function flowAttributeItems(tag: string): CompletionItemData[] {
  if (tag === "EACH") return attributeItems(EACH_ATTRIBUTES, "Each: ");
  if (tag === "FOR") return attributeItems(FOR_ATTRIBUTES, "For: ");
  return [];
}

function attributeItems(names: string[], prefix: string): CompletionItemData[] {
  return names.map((name) => ({
    label: name,
    kind: "property",
    insertText: `${name}={$1}`,
    snippet: true,
    detail: `${prefix}${name}`,
  }));
}

const EVENT_ITEMS: CompletionItemData[] = EVENT_NAMES.map((name) => ({
  label: name,
  kind: "property",
  insertText: `${name}={$1}`,
  snippet: true,
  detail: findApiById("event")?.summary,
}));

const BIND_ELEMENT_ITEM: CompletionItemData = {
  label: "bind-element",
  kind: "property",
  insertText: "bind-element={$1}",
  snippet: true,
  detail: findApiById("bind-element")?.summary,
};

const FORM_BIND_ITEMS: CompletionItemData[] = [
  {
    label: "bind",
    kind: "property",
    insertText: "bind={$1}",
    snippet: true,
    detail: findApiById("bind")?.summary,
  },
  {
    label: "bind-value",
    kind: "property",
    insertText: "bind-value={$1}",
    snippet: true,
    detail: findApiById("bind-prop")?.summary,
  },
  {
    label: "bind-checked",
    kind: "property",
    insertText: "bind-checked={$1}",
    snippet: true,
    detail: findApiById("bind-prop")?.summary,
  },
];

/** Attributes for a plain HTML tag: animate, events, bind-element, and bind on form controls. */
export function markupAttributeItems(tag: string): CompletionItemData[] {
  const common = [...MOTION_ATTRIBUTE_ITEMS, ...EVENT_ITEMS, BIND_ELEMENT_ITEM];
  return FORM_TAGS.has(tag) ? [...common, ...FORM_BIND_ITEMS] : common;
}
