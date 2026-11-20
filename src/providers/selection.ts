import * as vscode from "vscode";
import { regionAt } from "@language/regions.ts";
import { cssSelection, type CssSelectionRange } from "../logic/css.ts";
import { htmlSelection, type RegionSelection } from "../logic/html.ts";
import { rangeOf } from "./common.ts";

export class LusiaSelectionRangeProvider implements vscode.SelectionRangeProvider {
  provideSelectionRanges(
    document: vscode.TextDocument,
    positions: vscode.Position[],
  ): vscode.SelectionRange[] {
    const text = document.getText();
    return positions.map((position) => selectionAt(document, text, position));
  }
}

function selectionAt(
  document: vscode.TextDocument,
  text: string,
  position: vscode.Position,
): vscode.SelectionRange {
  const offset = document.offsetAt(position);
  const region = regionAt(text, offset);
  if (region.kind === "style") {
    const selection = cssSelection(text, [offset])[0];
    if (selection) return toSelection(document, selection);
  }
  if (region.kind === "markup") {
    const [selection] = htmlSelection(text, [offset]);
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
