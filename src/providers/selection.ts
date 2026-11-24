import * as vscode from "vscode";
import { cssSelection, type CssSelectionRange } from "../logic/css.ts";
import { htmlSelection, type RegionSelection } from "../logic/html.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import type { LusiaHost } from "../host/types.ts";
import { rangeOf } from "./common.ts";

export class LusiaSelectionRangeProvider
  implements vscode.SelectionRangeProvider
{
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideSelectionRanges(
    document: vscode.TextDocument,
    positions: vscode.Position[],
  ): Promise<vscode.SelectionRange[]> {
    const host = await this.hosts(document);
    if (!host) return [];
    const text = document.getText();
    return positions.map((position) =>
      selectionAt(host, document, text, position),
    );
  }
}

function selectionAt(
  host: LusiaHost,
  document: vscode.TextDocument,
  text: string,
  position: vscode.Position,
): vscode.SelectionRange {
  const offset = document.offsetAt(position);
  const region = host.parseRegions.regionAt(text, offset);
  if (region.kind === "style") {
    const selection = cssSelection(host, text, [offset])[0];
    if (selection) return toSelection(document, selection);
  }
  if (region.kind === "markup") {
    const [selection] = htmlSelection(host, text, [offset]);
    if (selection) return toSelection(document, selection);
  }
  return new vscode.SelectionRange(new vscode.Range(position, position));
}

function toSelection(
  document: vscode.TextDocument,
  selection: RegionSelection | CssSelectionRange,
): vscode.SelectionRange {
  const result = new vscode.SelectionRange(rangeOf(document, selection.range));
  if (selection.parent) result.parent = toSelection(document, selection.parent);
  return result;
}
