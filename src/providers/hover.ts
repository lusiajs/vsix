import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssHover } from "../logic/css.ts";
import { htmlHover } from "../logic/html.ts";
import type { TextRange } from "lusiajs/editor/range.ts";
import { apiHoverMarkdown } from "../logic/api-hover.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { inTsRegion, projectOf } from "./common.ts";

export class LusiaHoverProvider implements vscode.HoverProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) =>
      componentProps(host, document.fileName, text, name);
    const symbolsOf = (specifier: string) =>
      scriptSymbols(host, document.fileName, specifier);
    const shared = host.hover.hoverAt(text, offset, propsOf, symbolsOf);
    if (shared?.kind === "api") {
      return hover(
        apiHoverMarkdown(shared.entry),
        shared.range && rangeOf(document, shared.range),
      );
    }
    if (inTsRegion(host, text, offset)) {
      const typed = projectOf(host, document).hover(offset);
      if (typed) return hover(typed.markdown, rangeOf(document, typed.range));
    }
    const result =
      shared ??
      htmlHover(host, text, offset) ??
      cssHover(host, text, offset, document.fileName);
    if (!result) return undefined;
    return hover(
      host.markdown.hoverMarkdown(result),
      result.range && rangeOf(document, result.range),
    );
  }
}

function hover(contents: string, range?: vscode.Range): vscode.Hover {
  return range
    ? new vscode.Hover(new vscode.MarkdownString(contents), range)
    : new vscode.Hover(new vscode.MarkdownString(contents));
}

function rangeOf(
  document: vscode.TextDocument,
  range: TextRange,
): vscode.Range {
  return new vscode.Range(
    document.positionAt(range.start),
    document.positionAt(range.end),
  );
}
