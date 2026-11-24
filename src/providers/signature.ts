import * as vscode from "vscode";
import { hostFor, type HostSource } from "../host/source.ts";
import { inTsRegion, projectOf } from "./common.ts";

export class LusiaSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.SignatureHelp | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (!inTsRegion(host, text, offset)) return undefined;
    const help = projectOf(host, document).signatureHelp(offset);
    if (!help) return undefined;
    const signature = new vscode.SignatureInformation(
      help.label,
      help.documentation,
    );
    signature.parameters = help.parameters.map(
      (parameter) =>
        new vscode.ParameterInformation(
          parameter.label,
          parameter.documentation,
        ),
    );
    const result = new vscode.SignatureHelp();
    result.signatures = [signature];
    result.activeSignature = 0;
    result.activeParameter = help.activeParameter;
    return result;
  }
}
