// The ESM build bundles; the UMD factory hides its requires from Bun.
import {
  getLanguageService,
  type HTMLDocument,
  type LanguageService,
} from "vscode-html-languageservice/lib/esm/htmlLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { LusiaHost } from "../host/types.ts";
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
export function editable(
  host: LusiaHost,
  text: string,
  offset: number,
): boolean {
  return (
    host.parseRegions.regionAt(text, offset).kind === "markup" &&
    !host.formatExpressions.inExpressionAt(text, offset)
  );
}

export function ownedTag(
  host: LusiaHost,
  text: string,
  offset: number,
): boolean {
  const tag = host.parseTag.openTagAt(text, offset);
  if (!tag) return false;
  return (
    tag.name === "style" ||
    tag.name === "script" ||
    host.markupItems.isFlowTag(tag.name) ||
    host.parseImports.findComponentImport(text, tag.name) !== undefined
  );
}

/** Whether a tag is plain HTML: lowercase, not a component and not a flow tag. */
export function isPlainTag(
  host: LusiaHost,
  text: string,
  name: string,
): boolean {
  return (
    /^[a-z][\w.-]*$/.test(name) &&
    name !== "style" &&
    name !== "script" &&
    !host.markupItems.isFlowTag(name) &&
    host.parseImports.findComponentImport(text, name) === undefined
  );
}

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

export function startTagNameBefore(
  text: string,
  offset: number,
): string | undefined {
  const open = text.lastIndexOf("<", offset - 1);
  if (open === -1) return undefined;
  return TAG_HEAD.exec(text.slice(open, offset))?.[1];
}
