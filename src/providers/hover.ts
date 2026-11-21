import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssHover } from "../logic/css.ts";
import { htmlHover } from "../logic/html.ts";
import { hoverAt } from "lusiajs/editor/hover.ts";
import { hoverMarkdown } from "lusiajs/editor/markdown.ts";
import type { TextRange } from "lusiajs/editor/range.ts";
import { apiHoverMarkdown } from "../logic/api-hover.ts";
import { inTsRegion, projectOf } from "./common.ts";

export class LusiaHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) => componentProps(document.fileName, text, name);
    const symbolsOf = (specifier: string) => scriptSymbols(document.fileName, specifier);
    const shared = hoverAt(text, offset, propsOf, symbolsOf);
    if (shared?.kind === "api") {
      return hover(apiHoverMarkdown(shared.entry), shared.range && rangeOf(document, shared.range));
    }
    if (inTsRegion(text, offset)) {
      const typed = projectOf(document).hover(offset);
      if (typed) return hover(typed.markdown, rangeOf(document, typed.range));
    }
    const result = shared ?? htmlHover(text, offset) ?? cssHover(text, offset, document.fileName);
    if (!result) return undefined;
    return hover(hoverMarkdown(result), result.range && rangeOf(document, result.range));
  }
}

function hover(contents: string, range?: vscode.Range): vscode.Hover {
  return range
    ? new vscode.Hover(new vscode.MarkdownString(contents), range)
    : new vscode.Hover(new vscode.MarkdownString(contents));
}

function rangeOf(document: vscode.TextDocument, range: TextRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}
