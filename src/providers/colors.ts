import * as vscode from "vscode";
import { cssColorPresentations, cssColors } from "../logic/css.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { rangeOf } from "./common.ts";

export class LusiaColorProvider implements vscode.DocumentColorProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideDocumentColors(document: vscode.TextDocument): Promise<vscode.ColorInformation[]> {
    const host = await this.hosts(document);
    if (!host) return [];
    return cssColors(host, document.getText()).map(
      (info) =>
        new vscode.ColorInformation(
          rangeOf(document, info.range),
          new vscode.Color(info.color.red, info.color.green, info.color.blue, info.color.alpha),
        ),
    );
  }

  async provideColorPresentations(
    _color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
  ): Promise<vscode.ColorPresentation[]> {
    const document = context.document;
    const host = await this.hosts(document);
    if (!host) return [];
    return cssColorPresentations(
      host,
      document.getText(),
      document.offsetAt(context.range.start),
    ).map((presentation) => {
      const item = new vscode.ColorPresentation(presentation.label);
      item.textEdit = vscode.TextEdit.replace(
        rangeOf(document, presentation.edit.range),
        presentation.edit.newText,
      );
      if (presentation.additionalEdits) {
        item.additionalTextEdits = presentation.additionalEdits.map((additional) =>
          vscode.TextEdit.replace(rangeOf(document, additional.range), additional.newText),
        );
      }
      return item;
    });
  }
}
