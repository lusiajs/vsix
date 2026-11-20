import * as vscode from "vscode";
import { cssColorPresentations, cssColors } from "../logic/css.ts";
import { rangeOf } from "./common.ts";

export class LusiaColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
    return cssColors(document.getText()).map(
      (info) =>
        new vscode.ColorInformation(
          rangeOf(document, info.range),
          new vscode.Color(info.color.red, info.color.green, info.color.blue, info.color.alpha),
        ),
    );
  }

  provideColorPresentations(
    _color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
  ): vscode.ColorPresentation[] {
    const document = context.document;
    return cssColorPresentations(document.getText(), document.offsetAt(context.range.start)).map(
      (presentation) => {
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
      },
    );
  }
}
