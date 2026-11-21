import { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionKind } from "../../../shared/completion-data.ts";
import type { TextRange } from "../../../shared/range.ts";

/** A position in a language server document, kept structural so this file needs no LSP types. */
export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export function editorDocument(uri: string, languageId: string, text: string): TextDocument {
  return TextDocument.create(uri, languageId, 1, text);
}

const KINDS: Record<number, CompletionKind> = {
  3: "function",
  5: "property",
  6: "variable",
  7: "class",
  8: "type",
  10: "property",
  11: "variable",
  12: "variable",
  13: "type",
  14: "keyword",
  15: "snippet",
  20: "variable",
  21: "variable",
  22: "class",
  25: "type",
};

/** The editor kind for a language server `CompletionItemKind` number. */
export function toCompletionKind(kind: number | undefined): CompletionKind {
  return (kind !== undefined ? KINDS[kind] : undefined) ?? "property";
}

/** The markdown of a language server hover, or undefined when it is empty. */
export function hoverText(hover: { contents: unknown } | null | undefined): string | undefined {
  return hover ? contentsText(hover.contents) : undefined;
}

export function offsetRange(
  document: TextDocument,
  range: LspRange | undefined,
): TextRange | undefined {
  if (!range) return undefined;
  return { start: document.offsetAt(range.start), end: document.offsetAt(range.end) };
}

function contentsText(contents: unknown): string | undefined {
  if (typeof contents === "string") return contents === "" ? undefined : contents;
  if (Array.isArray(contents)) {
    const parts = contents.map(itemText).filter((part): part is string => part !== undefined);
    return parts.length === 0 ? undefined : parts.join("\n\n");
  }
  return itemText(contents);
}

function itemText(item: unknown): string | undefined {
  if (typeof item === "string") return item === "" ? undefined : item;
  if (isCode(item)) return ["```" + item.language, item.value, "```"].join("\n");
  if (isMarkup(item)) return item.value === "" ? undefined : item.value;
  return undefined;
}

function isCode(value: unknown): value is { language: string; value: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "language" in value &&
    typeof value.language === "string" &&
    "value" in value &&
    typeof value.value === "string"
  );
}

function isMarkup(value: unknown): value is { kind: string; value: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "value" in value &&
    typeof value.value === "string"
  );
}
