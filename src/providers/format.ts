import * as vscode from "vscode";
import { readIndentSetting } from "lusiajs/language/format/indent-setting.ts";
import { formatLusia } from "../logic/format.ts";

export class LusiaFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
  ): Promise<vscode.TextEdit[]> {
    const source = document.getText();
    const formatted = await formatLusia(source, {
      fileName: document.fileName,
      tabSize: options?.tabSize,
      insertSpaces: options?.insertSpaces,
      indentScriptAndStyle: indentSettingFor(document),
    }).catch(() => undefined);
    if (formatted === undefined || formatted === source) return [];
    const whole = new vscode.Range(
      document.positionAt(0),
      document.positionAt(source.length),
    );
    return [vscode.TextEdit.replace(whole, formatted)];
  }
}

function indentSettingFor(document: vscode.TextDocument): boolean {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return folder === undefined ? true : readIndentSetting(folder.uri.fsPath);
}
