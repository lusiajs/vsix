import * as vscode from "vscode";
import type { Section } from "lusiajs/language/parse/sections.ts";
import { cssFolding } from "../logic/css.ts";
import { htmlFolding, type RegionFolding } from "../logic/html.ts";
import { hostFor, type HostSource } from "../host/source.ts";

export class LusiaFoldingRangeProvider implements vscode.FoldingRangeProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideFoldingRanges(
    document: vscode.TextDocument,
  ): Promise<vscode.FoldingRange[]> {
    const host = await this.hosts(document);
    if (!host) return [];
    const text = document.getText();
    return [
      ...htmlFolding(text).map(
        (fold) =>
          new vscode.FoldingRange(
            fold.startLine,
            fold.endLine,
            kindOf(fold.kind),
          ),
      ),
      ...cssFolding(host, text).flatMap((fold) =>
        offsetRange(document, fold.start, fold.end, fold.kind),
      ),
      ...host.parseSections
        .findSections(text)
        .flatMap((section) => sectionRange(document, section)),
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
  return endLine > startLine
    ? [new vscode.FoldingRange(startLine, endLine, kindOf(kind))]
    : [];
}

function sectionRange(
  document: vscode.TextDocument,
  section: Pick<Section, "openStart" | "end">,
): vscode.FoldingRange[] {
  const startLine = document.positionAt(section.openStart).line;
  const endLine = document.positionAt(section.end).line;
  return endLine > startLine
    ? [new vscode.FoldingRange(startLine, endLine - 1)]
    : [];
}

function kindOf(
  kind: RegionFolding["kind"],
): vscode.FoldingRangeKind | undefined {
  if (kind === "comment") return vscode.FoldingRangeKind.Comment;
  if (kind === "imports") return vscode.FoldingRangeKind.Imports;
  return kind === "region" ? vscode.FoldingRangeKind.Region : undefined;
}
