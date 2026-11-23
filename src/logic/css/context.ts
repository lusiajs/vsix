// The ESM build bundles; the UMD factory hides its requires from Bun.
import {
  getCSSLanguageService,
  getSCSSLanguageService,
} from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { LanguageService } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { TextRange } from "lusiajs/editor/range.ts";
import type { Section } from "lusiajs/language/parse/sections.ts";
import type { LusiaHost } from "../../host/types.ts";
import { editorDocument, type LspPosition } from "../language-service.ts";

export type StyleLanguage = "css" | "scss";

export interface StyleSection {
  section: Section;
  document: TextDocument;
  service: LanguageService;
  language: StyleLanguage;
  /** The style content without the tags. */
  content: string;
}

export interface StyleContext extends StyleSection {
  position: LspPosition;
}

const STYLE_URI = "inmemory://lusia/style";
const CSS_LANG = /(?:^|\s)lang\s*=\s*(?:"css"|'css')/i;

const services: { css?: LanguageService; scss?: LanguageService } = {};

export function styleContextAt(
  host: LusiaHost,
  text: string,
  offset: number,
): StyleContext | undefined {
  const region = host.parseRegions.regionAt(text, offset);
  if (region.kind !== "style" || !region.section) return undefined;
  const style = styleSection(region.section, text);
  return { ...style, position: style.document.positionAt(offset - style.section.contentStart) };
}

export function styleSections(host: LusiaHost, text: string): StyleSection[] {
  return host.parseSections
    .findSections(text)
    .filter((section) => section.kind === "style")
    .map((section) => styleSection(section, text));
}

export function shift(range: TextRange, by: number): TextRange {
  return { start: range.start + by, end: range.end + by };
}

function styleSection(section: Section, text: string): StyleSection {
  const language: StyleLanguage = CSS_LANG.test(section.attrs) ? "css" : "scss";
  const content = text.slice(section.contentStart, section.contentEnd);
  return {
    section,
    document: editorDocument(`${STYLE_URI}.${language}`, language, content),
    service: service(language),
    language,
    content,
  };
}

function service(language: StyleLanguage): LanguageService {
  return (services[language] ??=
    language === "css"
      ? getCSSLanguageService({ useDefaultDataProvider: true })
      : getSCSSLanguageService({ useDefaultDataProvider: true }));
}
