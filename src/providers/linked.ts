import * as vscode from "vscode";
import { htmlLinkedRanges } from "../logic/html.ts";
import { rangeOf } from "./common.ts";

export class LusiaLinkedEditingProvider implements vscode.LinkedEditingRangeProvider {
  provideLinkedEditingRanges(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.LinkedEditingRanges | undefined {
    const ranges = htmlLinkedRanges(document.getText(), document.offsetAt(position));
    return ranges === undefined
      ? undefined
      : new vscode.LinkedEditingRanges(ranges.map((range) => rangeOf(document, range)));
  }
}
