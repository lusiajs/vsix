import * as vscode from "vscode";
import { hostFor, type HostSource } from "../host/source.ts";
import type { LusiaHost } from "../host/types.ts";
import { formatLusia } from "../logic/format.ts";

export class LusiaFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
  ): Promise<vscode.TextEdit[]> {
    const host = await this.hosts(document);
    if (!host) return [];
    const source = document.getText();
    const formatted = await formatLusia(host, source, {
      fileName: document.fileName,
      tabSize: options?.tabSize,
      insertSpaces: options?.insertSpaces,
      indentScriptAndStyle: indentSettingFor(host, document),
    }).catch(() => undefined);
    if (formatted === undefined || formatted === source) return [];
    const whole = new vscode.Range(
      document.positionAt(0),
      document.positionAt(source.length),
    );
    return [vscode.TextEdit.replace(whole, formatted)];
  }
}

function indentSettingFor(
  host: LusiaHost,
  document: vscode.TextDocument,
): boolean {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return folder === undefined
    ? true
    : host.indentSetting.readIndentSetting(folder.uri.fsPath);
}
