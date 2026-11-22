import * as vscode from "vscode";
import { cssHighlights } from "../logic/css.ts";
import { htmlHighlights, type RegionHighlight } from "../logic/html.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { rangeOf } from "./common.ts";

export class LusiaDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.DocumentHighlight[] | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    const offset = document.offsetAt(position);
    const highlights = [
      ...htmlHighlights(host, text, offset).map(
        (highlight) =>
          new vscode.DocumentHighlight(rangeOf(document, highlight.range), kindOf(highlight.kind)),
      ),
      ...cssHighlights(host, text, offset).map(
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
