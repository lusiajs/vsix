// The ESM build bundles; the UMD factory hides its requires from Bun.
import {
  getLanguageService,
  type HTMLDocument,
  type LanguageService,
} from "vscode-html-languageservice/lib/esm/htmlLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { inExpressionAt } from "@language/format/format-expressions.ts";
import { findComponentImport } from "@language/parse/imports.ts";
import { isFlowTag } from "../../../shared/markup-items.ts";
import { regionAt } from "@language/parse/regions.ts";
import { openTagAt } from "@language/parse/tag.ts";
import { editorDocument } from "./language-service.ts";

export const URI = "inmemory://lusia/markup.html";

export interface MarkupDocument {
  document: TextDocument;
  parsed: HTMLDocument;
}

export interface TagName {
  name: string;
  start: number;
  end: number;
}

const TAG_NAME = /^[A-Za-z][\w.-]*/;
const TAG_HEAD = /^<([A-Za-z][\w.-]*)(?=[\s/>])/;

let service: LanguageService | undefined;

export function htmlService(): LanguageService {
  service ??= getLanguageService({ useDefaultDataProvider: true });
  return service;
}

export function markupDocument(text: string): TextDocument {
  return editorDocument(URI, "html", text);
}

export function markupHtml(text: string): MarkupDocument {
  const document = markupDocument(text);
  return { document, parsed: htmlService().parseHTMLDocument(document) };
}

/** The HTML service only sees markup outside an expression. */
export function editable(text: string, offset: number): boolean {
  return regionAt(text, offset).kind === "markup" && !inExpressionAt(text, offset);
}

/** Whether the shared completion table owns the tag at the cursor. */
export function ownedTag(text: string, offset: number): boolean {
  const tag = openTagAt(text, offset);
  if (!tag) return false;
  return (
    tag.name === "style" ||
    tag.name === "script" ||
    isFlowTag(tag.name) ||
    findComponentImport(text, tag.name) !== undefined
  );
}

/** Whether a tag is plain HTML: lowercase, not a component and not a flow tag. */
export function isPlainTag(text: string, name: string): boolean {
  return (
    /^[a-z][\w.-]*$/.test(name) &&
    name !== "style" &&
    name !== "script" &&
    !isFlowTag(name) &&
    findComponentImport(text, name) === undefined
  );
}

/** The tag whose name the cursor is on, in an opening or closing tag. */
export function tagNameAt(text: string, offset: number): TagName | undefined {
  if (offset <= 0) return undefined;
  const open = text.lastIndexOf("<", offset);
  if (open === -1) return undefined;
  let start = open + 1;
  if (text.charAt(start) === "/") start++;
  const name = TAG_NAME.exec(text.slice(start))?.[0];
  if (!name || offset < start || offset > start + name.length) return undefined;
  return { name, start, end: start + name.length };
}

/** The name of the start tag whose `>` ends at `offset`. */
export function startTagNameBefore(text: string, offset: number): string | undefined {
  const open = text.lastIndexOf("<", offset - 1);
  if (open === -1) return undefined;
  return TAG_HEAD.exec(text.slice(open, offset))?.[1];
}
