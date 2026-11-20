import * as vscode from "vscode";
import { htmlTagClose } from "../logic/html.ts";
import { rangeOf } from "./common.ts";

export class LusiaOnTypeFormattingProvider implements vscode.OnTypeFormattingEditProvider {
  provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.TextEdit[] {
    const close = htmlTagClose(document.getText(), document.offsetAt(position));
    return close ? [vscode.TextEdit.replace(rangeOf(document, close.range), close.newText)] : [];
  }
}
