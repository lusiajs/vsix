import * as vscode from "vscode";
import { componentPath } from "../component-file.ts";
import { tagNameAt } from "../logic/tag.ts";

export class LuciaDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
    const text = document.getText();
    const tag = tagNameAt(text, document.offsetAt(position));
    const path = tag ? componentPath(document.fileName, text, tag.name) : undefined;
    return path ? new vscode.Location(vscode.Uri.file(path), new vscode.Position(0, 0)) : undefined;
  }
}
