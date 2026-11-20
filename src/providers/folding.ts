import * as vscode from "vscode";
import { findSections } from "@language/sections.ts";
import { cssFolding } from "../logic/css.ts";
import { htmlFolding, type RegionFolding } from "../logic/html.ts";

export class LusiaFoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const text = document.getText();
    return [
      ...htmlFolding(text).map(
        (fold) => new vscode.FoldingRange(fold.startLine, fold.endLine, kindOf(fold.kind)),
      ),
      ...cssFolding(text).flatMap((fold) => offsetRange(document, fold.start, fold.end, fold.kind)),
      ...findSections(text).flatMap((section) => sectionRange(document, section)),
    ];
  }
}

function offsetRange(
  document: vscode.TextDocument,
  start: number,
  end: number,
  kind: RegionFolding["kind"],
): vscode.FoldingRange[] {
  const startLine = document.positionAt(start).line;
  const endLine = document.positionAt(end).line;
  return endLine > startLine ? [new vscode.FoldingRange(startLine, endLine, kindOf(kind))] : [];
}

function sectionRange(
  document: vscode.TextDocument,
  section: { openStart: number; end: number },
): vscode.FoldingRange[] {
  const startLine = document.positionAt(section.openStart).line;
  const endLine = document.positionAt(section.end).line;
  return endLine > startLine ? [new vscode.FoldingRange(startLine, endLine - 1)] : [];
}

function kindOf(kind: RegionFolding["kind"]): vscode.FoldingRangeKind | undefined {
  if (kind === "comment") return vscode.FoldingRangeKind.Comment;
  if (kind === "imports") return vscode.FoldingRangeKind.Imports;
  return kind === "region" ? vscode.FoldingRangeKind.Region : undefined;
}
