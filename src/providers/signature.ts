import * as vscode from "vscode";
import { inTsRegion, projectOf } from "./common.ts";

export class LusiaSignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.SignatureHelp | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (!inTsRegion(text, offset)) return undefined;
    const help = projectOf(document).signatureHelp(offset);
    if (!help) return undefined;
    const signature = new vscode.SignatureInformation(help.label, help.documentation);
    signature.parameters = help.parameters.map(
      (parameter) => new vscode.ParameterInformation(parameter.label, parameter.documentation),
    );
    const result = new vscode.SignatureHelp();
    result.signatures = [signature];
    result.activeSignature = 0;
    result.activeParameter = help.activeParameter;
    return result;
  }
}
