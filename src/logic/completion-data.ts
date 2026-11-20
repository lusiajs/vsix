import type { PropDef } from "./props.ts";
import { apiKey, findApiById, importableApi, importKey } from "./api-lookup.ts";
import type { LusiaImport } from "./imports.ts";
import type { ApiEntry } from "../../../../reference/api.ts";

export type CompletionKind =
  "function" | "type" | "class" | "property" | "keyword" | "snippet" | "variable";

export interface CompletionItemData {
  label: string;
  kind: CompletionKind;
  insertText: string;
  snippet: boolean;
  detail?: string;
}

/** A script item; `importName` says which `lusia` import it needs. */
export interface ScriptItem extends CompletionItemData {
  importName?: string;
}

const PROPS_SNIPPET = 'props({ ${1:label}: ${2:"New"} })';

const SCRIPT_KINDS: Record<ApiEntry["kind"], CompletionKind> = {
  function: "function",
  type: "type",
  value: "variable",
  markup: "keyword",
  style: "keyword",
};

export function scriptItems(): ScriptItem[] {
  const apiItems = importableApi().map((entry): ScriptItem => {
    return {
      label: apiKey(entry),
      kind: SCRIPT_KINDS[entry.kind],
      insertText: apiKey(entry),
      snippet: false,
      detail: entry.signature,
      importName: importKey(entry),
    };
  });
  const propsItem: ScriptItem = {
    label: "props({ ... })",
    kind: "snippet",
    insertText: PROPS_SNIPPET,
    snippet: true,
    detail: "Declare props with defaults",
    importName: "props",
  };
  return [...apiItems, propsItem];
}

export function tagNameItems(imports: LusiaImport[]): CompletionItemData[] {
  return imports.map((item) => ({
    label: item.name,
    kind: "class",
    insertText: `${item.name} $1/>`,
    snippet: true,
    detail: "Component",
  }));
}

export function propItems(props: PropDef[]): CompletionItemData[] {
  return props.map((prop) => ({
    label: prop.name,
    kind: "property",
    insertText: `${prop.name}="$1"`,
    snippet: true,
    detail: prop.defaultValue === undefined ? "Prop" : `Prop, default ${prop.defaultValue}`,
  }));
}

export const STYLE_ATTRIBUTE_ITEMS: CompletionItemData[] = [
  {
    label: "scoped",
    kind: "keyword",
    insertText: "scoped",
    snippet: false,
    detail: "Scoped style",
  },
  {
    label: "global",
    kind: "keyword",
    insertText: "global",
    snippet: false,
    detail: "Global style",
  },
  {
    label: 'lang="css"',
    kind: "keyword",
    insertText: 'lang="css"',
    snippet: false,
    detail: "Plain CSS, no Sass",
  },
];

export const STYLE_BODY_ITEMS: CompletionItemData[] = [
  {
    label: "@scoped",
    kind: "keyword",
    insertText: "@scoped {\n\t$1\n}",
    snippet: true,
    detail: "Scoped rules block",
  },
  {
    label: "@global",
    kind: "keyword",
    insertText: "@global {\n\t$1\n}",
    snippet: true,
    detail: "Global rules block",
  },
  {
    label: ":global()",
    kind: "keyword",
    insertText: ":global($1)",
    snippet: true,
    detail: "Global part of a selector",
  },
];

export const MOTION_ATTRIBUTE_ITEMS: CompletionItemData[] = [
  {
    label: "animate",
    kind: "keyword",
    insertText: "animate={$1}",
    snippet: true,
    detail: findApiById("animate")?.summary,
  },
];
