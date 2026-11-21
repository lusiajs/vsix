import type { Location } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { TextRange } from "../../../../../src/editor/range.ts";
import { offsetRange } from "../language-service.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import { memberDefinition, scssMemberAt, scssOccurrences } from "./scss/find.ts";
import { buildScssIndex } from "./scss/index.ts";
import { readScssFile } from "./scss/parse.ts";
import type { CssLocation } from "./types.ts";

export function cssDefinitions(text: string, offset: number, fileName?: string): CssLocation[] {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return [];
    const official = officialDefinitions(style);
    if (official.length > 0) return official;
    const hit = memberAt(style, fileName, offset);
    return hit ? [memberDefinition(hit.member)] : [];
  } catch {
    return [];
  }
}

export function cssReferences(text: string, offset: number, fileName?: string): CssLocation[] {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return [];
    const locations = officialReferences(style);
    const index = style.language === "scss" ? buildScssIndex(fileName, style.content) : undefined;
    const hit = index
      ? scssMemberAt(index, style.content, style.section.contentStart, offset)
      : undefined;
    if (hit) {
      const member = hit.member;
      for (const range of scssOccurrences(member, style.content, style.section.contentStart)) {
        locations.push({ range });
      }
      for (const path of index?.files ?? []) {
        const file = readScssFile(path);
        if (!file) continue;
        for (const range of scssOccurrences(member, file.text, 0)) {
          locations.push({ path, range });
        }
      }
    }
    return dedupe(locations);
  } catch {
    return [];
  }
}

export function cssHighlights(text: string, offset: number): TextRange[] {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return [];
    const stylesheet = style.service.parseStylesheet(style.document);
    return style.service
      .findDocumentHighlights(style.document, style.position, stylesheet)
      .map((highlight) => offsetRange(style.document, highlight.range))
      .filter((range): range is TextRange => range !== undefined)
      .map((range) => shift(range, style.section.contentStart));
  } catch {
    return [];
  }
}

function officialDefinitions(style: StyleContext): CssLocation[] {
  const stylesheet = style.service.parseStylesheet(style.document);
  const location = style.service.findDefinition(style.document, style.position, stylesheet);
  return location ? [locationResult(style, location)] : [];
}

function officialReferences(style: StyleContext): CssLocation[] {
  const stylesheet = style.service.parseStylesheet(style.document);
  return style.service
    .findReferences(style.document, style.position, stylesheet)
    .filter((location) => location.uri === style.document.uri)
    .map((location) => locationResult(style, location));
}

function locationResult(style: StyleContext, location: Location): CssLocation {
  const range = offsetRange(style.document, location.range);
  return {
    range: range ? shift(range, style.section.contentStart) : { start: 0, end: 0 },
  };
}

function memberAt(style: StyleContext, fileName: string | undefined, offset: number) {
  if (style.language !== "scss") return undefined;
  const index = buildScssIndex(fileName, style.content);
  if (index.members.length === 0) return undefined;
  return scssMemberAt(index, style.content, style.section.contentStart, offset);
}

function dedupe(locations: CssLocation[]): CssLocation[] {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.path ?? ""}:${location.range.start}:${location.range.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
