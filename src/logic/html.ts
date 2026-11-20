import {
  getLanguageService,
  type CompletionItem,
  type LanguageService,
} from "vscode-html-languageservice";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionResult } from "../../../shared/completions.ts";
import { inExpressionAt } from "../../../shared/format-expressions.ts";
import type { HoverResult } from "../../../shared/hover.ts";
import { findComponentImport } from "../../../shared/imports.ts";
import { isFlowTag } from "../../../shared/markup-items.ts";
import { regionAt } from "../../../shared/regions.ts";
import { isTagNameTyping, openTagAt } from "../../../shared/tag.ts";
import { editorDocument, hoverText, offsetRange, toCompletionKind } from "./language-service.ts";

const URI = "inmemory://lusia/markup.html";
const SNIPPET_FORMAT = 2;

let service: LanguageService | undefined;

export function htmlCompletions(text: string, offset: number): CompletionResult[] {
  if (!editable(text, offset)) return [];
  if (!isTagNameTyping(text, offset) && ownedTag(text, offset)) return [];
  const document = editorDocument(URI, "html", text);
  try {
    const htmlDocument = html().parseHTMLDocument(document);
    const list = html().doComplete(document, document.positionAt(offset), htmlDocument);
    const results: CompletionResult[] = [];
    for (const item of list.items) {
      const result = completionResult(document, item);
      if (result) results.push(result);
    }
    return results;
  } catch {
    return [];
  }
}

export function htmlHover(text: string, offset: number): HoverResult | undefined {
  if (!editable(text, offset) || ownedTag(text, offset) || !insideTag(text, offset)) return undefined;
  const document = editorDocument(URI, "html", text);
  try {
    const htmlDocument = html().parseHTMLDocument(document);
    const result = html().doHover(document, document.positionAt(offset), htmlDocument);
    const markdown = hoverText(result);
    if (!result || !markdown) return undefined;
    return { kind: "markdown", markdown, range: offsetRange(document, result.range) };
  } catch {
    return undefined;
  }
}

/** Whether the cursor is in a tag, not in the text between tags. */
function insideTag(text: string, offset: number): boolean {
  return text.lastIndexOf("<", offset) > text.lastIndexOf(">", offset);
}

/** The HTML service only sees markup outside an expression. */
function editable(text: string, offset: number): boolean {
  return regionAt(text, offset).kind === "markup" && !inExpressionAt(text, offset);
}

/** Whether the shared completion table owns the tag at the cursor. */
function ownedTag(text: string, offset: number): boolean {
  const tag = openTagAt(text, offset);
  if (!tag) return false;
  return (
    tag.name === "style" ||
    tag.name === "script" ||
    isFlowTag(tag.name) ||
    findComponentImport(text, tag.name) !== undefined
  );
}

function html(): LanguageService {
  service ??= getLanguageService({ useDefaultDataProvider: true });
  return service;
}

function completionResult(
  document: TextDocument,
  item: CompletionItem,
): CompletionResult | undefined {
  if (item.label === "") return undefined;
  const edit = item.textEdit;
  return {
    label: item.label,
    kind: toCompletionKind(item.kind),
    insertText: edit?.newText ?? item.insertText ?? item.label,
    snippet: item.insertTextFormat === SNIPPET_FORMAT,
    detail: item.detail,
    documentation: hoverText({ contents: item.documentation }),
    range: edit && "range" in edit ? offsetRange(document, edit.range) : undefined,
  };
}
