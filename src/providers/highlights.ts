import * as vscode from "vscode";
import { cssHighlights } from "../logic/css.ts";
import { htmlHighlights, type RegionHighlight } from "../logic/html.ts";
import { rangeOf } from "./common.ts";

export class LusiaDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
  provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.DocumentHighlight[] | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const highlights = [
      ...htmlHighlights(text, offset).map(
        (highlight) =>
          new vscode.DocumentHighlight(rangeOf(document, highlight.range), kindOf(highlight.kind)),
      ),
      ...cssHighlights(text, offset).map(
        (range) => new vscode.DocumentHighlight(rangeOf(document, range)),
      ),
    ];
    return highlights.length > 0 ? highlights : undefined;
  }
}

function kindOf(kind: RegionHighlight["kind"]): vscode.DocumentHighlightKind {
  if (kind === "write") return vscode.DocumentHighlightKind.Write;
  return kind === "read" ? vscode.DocumentHighlightKind.Read : vscode.DocumentHighlightKind.Text;
}
