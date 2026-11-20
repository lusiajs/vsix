import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssHover } from "../logic/css.ts";
import { htmlHover } from "../logic/html.ts";
import { hoverAt } from "../../../shared/hover.ts";
import { hoverMarkdown } from "../../../shared/markdown.ts";
import type { TextRange } from "../../../shared/range.ts";

export class LusiaHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) => componentProps(document.fileName, text, name);
    const symbolsOf = (specifier: string) => scriptSymbols(document.fileName, specifier);
    const result =
      hoverAt(text, offset, propsOf, symbolsOf) ??
      htmlHover(text, offset) ??
      cssHover(text, offset);
    if (!result) return undefined;
    const contents = new vscode.MarkdownString(hoverMarkdown(result));
    return result.range
      ? new vscode.Hover(contents, rangeOf(document, result.range))
      : new vscode.Hover(contents);
  }
}

function rangeOf(document: vscode.TextDocument, range: TextRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}
