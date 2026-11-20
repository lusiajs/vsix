import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { hoverAt } from "../../../shared/hover.ts";
import { hoverMarkdown } from "../../../shared/markdown.ts";

export class LusiaHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const text = document.getText();
    const lookup = (name: string) => componentProps(document.fileName, text, name);
    const result = hoverAt(text, document.offsetAt(position), lookup);
    return result ? new vscode.Hover(new vscode.MarkdownString(hoverMarkdown(result))) : undefined;
  }
}
