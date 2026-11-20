import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssHover } from "../logic/css.ts";
import { htmlHover } from "../logic/html.ts";
import { hoverAt } from "../../../shared/hover.ts";
import { hoverMarkdown } from "../../../shared/markdown.ts";
import type { TextRange } from "../../../shared/range.ts";
import { inTsRegion, projectOf } from "./common.ts";

export class LusiaHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) => componentProps(document.fileName, text, name);
    const symbolsOf = (specifier: string) => scriptSymbols(document.fileName, specifier);
    const shared = hoverAt(text, offset, propsOf, symbolsOf);
    if (shared) {
      const contents = new vscode.MarkdownString(hoverMarkdown(shared));
      return shared.range
        ? new vscode.Hover(contents, rangeOf(document, shared.range))
        : new vscode.Hover(contents);
    }
    if (inTsRegion(text, offset)) {
      const result = projectOf(document).hover(offset);
      if (result)
        return new vscode.Hover(
          new vscode.MarkdownString(result.markdown),
          rangeOf(document, result.range),
        );
    }
    const region = htmlHover(text, offset) ?? cssHover(text, offset, document.fileName);
    if (!region) return undefined;
    const contents = new vscode.MarkdownString(hoverMarkdown(region));
    return region.range
      ? new vscode.Hover(contents, rangeOf(document, region.range))
      : new vscode.Hover(contents);
  }
}

function rangeOf(document: vscode.TextDocument, range: TextRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}
