import * as vscode from "vscode";
import { htmlLinkedRanges } from "../logic/html.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { rangeOf } from "./common.ts";

export class LusiaLinkedEditingProvider implements vscode.LinkedEditingRangeProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideLinkedEditingRanges(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.LinkedEditingRanges | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const ranges = htmlLinkedRanges(host, document.getText(), document.offsetAt(position));
    return ranges === undefined
      ? undefined
      : new vscode.LinkedEditingRanges(ranges.map((range) => rangeOf(document, range)));
  }
}
