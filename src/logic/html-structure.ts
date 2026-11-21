import type {
  DocumentSymbol,
  SelectionRange,
} from "vscode-html-languageservice/lib/esm/htmlLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { inExpressionAt } from "@language/format/format-expressions.ts";
import { htmlService, markupDocument } from "./html-shared.ts";
import { offsetRange } from "./language-service.ts";
import type { RegionFolding, RegionLink, RegionSelection, RegionSymbol } from "./region-types.ts";

/** Static `href`/`src`-style references in the markup. */
export function htmlLinks(text: string): RegionLink[] {
  const document = markupDocument(text);
  try {
    const links = htmlService().findDocumentLinks(document, {
      resolveReference: (reference) => reference,
    });
    const results: RegionLink[] = [];
    for (const link of links) {
      const range = offsetRange(document, link.range);
      if (!range || link.target === undefined) continue;
      if (inExpression(text, range)) continue;
      const raw = text.slice(range.start, range.end);
      results.push({ range, target: raw.startsWith("#") ? raw : link.target });
    }
    return results;
  } catch {
    return [];
  }
}

/** The nested elements of the markup, as a document outline. */
export function htmlSymbols(text: string): RegionSymbol[] {
  const document = markupDocument(text);
  try {
    const symbols = htmlService().findDocumentSymbols2(
      document,
      htmlService().parseHTMLDocument(document),
    );
    return symbols.flatMap((symbol) => regionSymbol(document, symbol));
  } catch {
    return [];
  }
}

export function htmlFolding(text: string): RegionFolding[] {
  try {
    return htmlService()
      .getFoldingRanges(markupDocument(text))
      .map((folding) => ({
        startLine: folding.startLine,
        endLine: folding.endLine,
        kind: foldingKind(folding.kind),
      }));
  } catch {
    return [];
  }
}

export function htmlSelection(text: string, offsets: number[]): RegionSelection[] {
  if (offsets.length === 0) return [];
  const document = markupDocument(text);
  try {
    return htmlService()
      .getSelectionRanges(
        document,
        offsets.map((offset) => document.positionAt(offset)),
      )
      .flatMap((selection) => {
        const result = regionSelection(document, selection);
        return result ? [result] : [];
      });
  } catch {
    return [];
  }
}

/** A range stays out of links when it is the value of a `{...}` expression. */
function inExpression(text: string, range: { start: number; end: number }): boolean {
  return text.charAt(range.start) === "{" || inExpressionAt(text, range.start);
}

function regionSymbol(document: TextDocument, symbol: DocumentSymbol): RegionSymbol[] {
  const range = offsetRange(document, symbol.range);
  const selectionRange = offsetRange(document, symbol.selectionRange);
  if (!range || !selectionRange) return [];
  return [
    {
      name: symbol.name,
      detail: symbol.detail,
      kind: symbol.kind,
      range,
      selectionRange,
      children: symbol.children?.flatMap((child) => regionSymbol(document, child)) ?? [],
    },
  ];
}

function regionSelection(
  document: TextDocument,
  selection: SelectionRange,
): RegionSelection | undefined {
  const range = offsetRange(document, selection.range);
  if (!range) return undefined;
  const parent = selection.parent ? regionSelection(document, selection.parent) : undefined;
  return parent ? { range, parent } : { range };
}

function foldingKind(kind: string | undefined): RegionFolding["kind"] {
  return kind === "comment" || kind === "imports" || kind === "region" ? kind : undefined;
}
