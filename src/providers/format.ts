import * as vscode from "vscode";
import { formatLusia } from "../logic/format.ts";

export class LusiaFormattingProvider implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    const source = document.getText();
    const formatted = await formatLusia(source).catch(() => undefined);
    if (formatted === undefined || formatted === source) return [];
    const whole = new vscode.Range(document.positionAt(0), document.positionAt(source.length));
    return [vscode.TextEdit.replace(whole, formatted)];
  }
}
