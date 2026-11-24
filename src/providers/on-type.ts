import * as vscode from "vscode";
import { htmlTagClose } from "../logic/html.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { rangeOf } from "./common.ts";

export class LusiaOnTypeFormattingProvider
  implements vscode.OnTypeFormattingEditProvider
{
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.TextEdit[]> {
    const host = await this.hosts(document);
    if (!host) return [];
    const close = htmlTagClose(
      host,
      document.getText(),
      document.offsetAt(position),
    );
    return close
      ? [vscode.TextEdit.replace(rangeOf(document, close.range), close.newText)]
      : [];
  }
}
