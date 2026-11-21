import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vscode from "vscode";
import { inExpressionAt } from "lusia/language/format/format-expressions.ts";
import { regionAt } from "lusia/language/parse/regions.ts";
import type { TextRange } from "lusia/editor/range.ts";
import type { CssSymbolKind } from "../logic/css.ts";
import { TsProject } from "../ts/project.ts";
import type { TsLocation } from "../ts/types.ts";

const WORD_CHAR = /[\w$]/;

/** Whether the cursor is in a script section or a `{...}` markup expression. */
export function inTsRegion(text: string, offset: number): boolean {
  const region = regionAt(text, offset);
  if (region.kind === "style") return false;
  if (region.kind === "script") return true;
  return inExpressionAt(text, offset);
}

export function projectOf(document: vscode.TextDocument): TsProject {
  return TsProject.open(document.fileName, document.getText());
}

export function rangeOf(document: vscode.TextDocument, range: TextRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}

/** A position in any file: the editor's own text, or the file read from disk. */
export function positionIn(
  document: vscode.TextDocument,
  fileName: string,
  offset: number,
): vscode.Position {
  if (sameFile(document.fileName, fileName)) return document.positionAt(offset);
  const text = readText(fileName);
  return text === undefined ? new vscode.Position(0, 0) : positionAt(text, offset);
}

/** The same pure mapping as `TextDocument.positionAt`, for a file the editor has not opened. */
export function positionAt(text: string, offset: number): vscode.Position {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const starts = startsOf(text);
  const line = lineOf(starts, clamped);
  return new vscode.Position(line, clamped - (starts[line] ?? 0));
}

export function locationOf(
  document: vscode.TextDocument,
  fileName: string,
  start: number,
  end: number = start,
): vscode.Location {
  const uri = sameFile(document.fileName, fileName) ? document.uri : vscode.Uri.file(fileName);
  const range = sameFile(document.fileName, fileName)
    ? new vscode.Range(document.positionAt(start), document.positionAt(end))
    : new vscode.Range(positionIn(document, fileName, start), positionIn(document, fileName, end));
  return new vscode.Location(uri, range);
}

export function tsLocations(
  document: vscode.TextDocument,
  locations: TsLocation[],
): vscode.Location[] {
  return locations.map((location) => locationOf(document, location.fileName, location.start));
}

export function symbolKindOf(kind: number): vscode.SymbolKind {
  const mapped = kind - 1;
  return mapped >= vscode.SymbolKind.File && mapped <= vscode.SymbolKind.TypeParameter
    ? mapped
    : vscode.SymbolKind.Object;
}

const CSS_SYMBOL_KINDS: Readonly<Record<CssSymbolKind, vscode.SymbolKind>> = {
  variable: vscode.SymbolKind.Variable,
  function: vscode.SymbolKind.Function,
  mixin: vscode.SymbolKind.Method,
  class: vscode.SymbolKind.Class,
  property: vscode.SymbolKind.Property,
  selector: vscode.SymbolKind.Namespace,
  other: vscode.SymbolKind.Object,
};

export function cssSymbolKindOf(kind: CssSymbolKind): vscode.SymbolKind {
  return CSS_SYMBOL_KINDS[kind];
}

/** The word that covers the cursor, for a rename placeholder. */
export function wordRangeAt(text: string, offset: number): TextRange | undefined {
  let start = Math.max(0, Math.min(offset, text.length));
  let end = start;
  while (start > 0 && WORD_CHAR.test(text.charAt(start - 1))) start--;
  while (end < text.length && WORD_CHAR.test(text.charAt(end))) end++;
  return start === end ? undefined : { start, end };
}

function sameFile(first: string, second: string): boolean {
  return resolve(first) === resolve(second);
}

function readText(fileName: string): string | undefined {
  try {
    return readFileSync(fileName, "utf8");
  } catch {
    return undefined;
  }
}

function startsOf(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((starts[middle] ?? 0) <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
}
