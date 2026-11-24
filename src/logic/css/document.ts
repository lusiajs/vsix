import type {
  DocumentSymbol,
  FoldingRange,
} from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { LusiaHost } from "../../host/types.ts";
import { offsetRange } from "../language-service.ts";
import { shift, styleSections, type StyleSection } from "./context.ts";
import { parseDirectives, resolveScssModule } from "./scss/parse.ts";
import type {
  CssFoldingRange,
  CssLink,
  CssSymbol,
  CssSymbolKind,
} from "./types.ts";

const SYMBOL_KINDS: Record<number, CssSymbolKind> = {
  5: "class",
  6: "mixin",
  7: "property",
  12: "function",
  13: "variable",
  14: "variable",
};

export function cssLinks(
  host: LusiaHost,
  text: string,
  fileName?: string,
): CssLink[] {
  if (!fileName) return [];
  const links: CssLink[] = [];
  for (const style of styleSections(host, text)) {
    for (const directive of parseDirectives(style.content)) {
      for (const path of directive.paths) {
        const resolved = resolveScssModule(fileName, path.value);
        if (!resolved) continue;
        links.push({
          path: resolved,
          range: shift(
            { start: path.offset, end: path.offset + path.value.length },
            style.section.contentStart,
          ),
        });
      }
    }
  }
  return links;
}

export function cssSymbols(host: LusiaHost, text: string): CssSymbol[] {
  const symbols: CssSymbol[] = [];
  for (const style of styleSections(host, text)) {
    try {
      const stylesheet = style.service.parseStylesheet(style.document);
      const list = style.service.findDocumentSymbols2(
        style.document,
        stylesheet,
      );
      for (const symbol of list) {
        const result = toSymbol(symbol, style);
        if (result) symbols.push(result);
      }
    } catch {
      continue;
    }
  }
  return symbols;
}

export function cssFolding(host: LusiaHost, text: string): CssFoldingRange[] {
  const ranges: CssFoldingRange[] = [];
  for (const style of styleSections(host, text)) {
    let list: FoldingRange[] = [];
    try {
      list = style.service.getFoldingRanges(style.document, {});
    } catch {
      continue;
    }
    for (const folding of list) {
      const start = lineOffset(
        style,
        folding.startLine,
        folding.startCharacter,
      );
      const end = lineOffset(style, folding.endLine, folding.endCharacter);
      if (start >= end) continue;
      ranges.push({
        start: start + style.section.contentStart,
        end: end + style.section.contentStart,
        kind: foldingKind(folding.kind),
      });
    }
  }
  return ranges;
}

function toSymbol(
  symbol: DocumentSymbol,
  style: StyleSection,
): CssSymbol | undefined {
  const range = offsetRange(style.document, symbol.range);
  const selectionRange = offsetRange(style.document, symbol.selectionRange);
  if (!range || !selectionRange) return undefined;
  const children = symbol.children
    ?.map((child) => toSymbol(child, style))
    .filter((child): child is CssSymbol => child !== undefined);
  return {
    name: symbol.name,
    kind: SYMBOL_KINDS[symbol.kind] ?? "other",
    range: shift(range, style.section.contentStart),
    selectionRange: shift(selectionRange, style.section.contentStart),
    children: children && children.length > 0 ? children : undefined,
  };
}

function lineOffset(
  style: StyleSection,
  line: number,
  character: number | undefined,
): number {
  const lineIndex = Math.min(Math.max(line, 0), style.document.lineCount - 1);
  const end = style.document.getLineRange(lineIndex).end;
  return style.document.offsetAt({
    line: lineIndex,
    character: character ?? end.character,
  });
}

function foldingKind(kind: string | undefined): CssFoldingRange["kind"] {
  return kind === "comment" || kind === "imports" || kind === "region"
    ? kind
    : undefined;
}
