// The ESM build bundles; the UMD factory hides its requires from Bun.
import {
  getCSSLanguageService,
  getSCSSLanguageService,
} from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type {
  CompletionItem,
  LanguageService,
} from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionResult } from "../../../shared/completions.ts";
import type { HoverResult } from "../../../shared/hover.ts";
import type { TextRange } from "../../../shared/range.ts";
import { regionAt } from "@language/regions.ts";
import type { Section } from "@language/sections.ts";
import {
  editorDocument,
  hoverText,
  offsetRange,
  toCompletionKind,
  type LspPosition,
} from "./language-service.ts";

const STYLE_URI = "inmemory://lusia/style.scss";
const CSS_LANG = /(?:^|\s)lang\s*=\s*(?:"css"|'css')/i;

type StyleLanguage = "css" | "scss";

const services: { css?: LanguageService; scss?: LanguageService } = {};

interface StyleContext {
  document: TextDocument;
  section: Section;
  service: LanguageService;
  position: LspPosition;
}

export function cssCompletions(text: string, offset: number): CompletionResult[] {
  try {
    const style = styleAt(text, offset);
    if (!style) return [];
    const stylesheet = style.service.parseStylesheet(style.document);
    const list = style.service.doComplete(style.document, style.position, stylesheet);
    return list.items.map((item) => completionItem(item, style));
  } catch {
    return [];
  }
}

export function cssHover(text: string, offset: number): HoverResult | undefined {
  try {
    const style = styleAt(text, offset);
    if (!style) return undefined;
    const stylesheet = style.service.parseStylesheet(style.document);
    const hover = style.service.doHover(style.document, style.position, stylesheet);
    const markdown = hoverText(hover);
    if (!markdown) return undefined;
    const range = offsetRange(style.document, hover?.range);
    return {
      kind: "markdown",
      markdown,
      range: range && shift(range, style.section.contentStart),
    };
  } catch {
    return undefined;
  }
}

function styleAt(text: string, offset: number): StyleContext | undefined {
  const region = regionAt(text, offset);
  if (region.kind !== "style" || !region.section) return undefined;
  const section = region.section;
  const language: StyleLanguage = CSS_LANG.test(section.attrs) ? "css" : "scss";
  const content = text.slice(section.contentStart, section.contentEnd);
  const document = editorDocument(STYLE_URI, language, content);
  return {
    document,
    section,
    service: service(language),
    position: document.positionAt(offset - section.contentStart),
  };
}

function service(language: StyleLanguage): LanguageService {
  return (services[language] ??=
    language === "css"
      ? getCSSLanguageService({ useDefaultDataProvider: true })
      : getSCSSLanguageService({ useDefaultDataProvider: true }));
}

function completionItem(item: CompletionItem, style: StyleContext): CompletionResult {
  return {
    label: item.label,
    kind: toCompletionKind(item.kind),
    insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
    snippet: item.insertTextFormat === 2,
    detail: item.detail,
    documentation: hoverText({ contents: item.documentation }),
    range: completionRange(item.textEdit, style),
  };
}

function completionRange(
  edit: CompletionItem["textEdit"],
  style: StyleContext,
): TextRange | undefined {
  if (!edit || !("range" in edit)) return undefined;
  const range = offsetRange(style.document, edit.range);
  return range && shift(range, style.section.contentStart);
}

/** A range in the sliced style document as a range in the whole component. */
function shift(range: TextRange, by: number): TextRange {
  return { start: range.start + by, end: range.end + by };
}
