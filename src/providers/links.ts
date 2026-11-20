import { dirname, resolve } from "node:path";
import * as vscode from "vscode";
import { cssLinks } from "../logic/css.ts";
import { htmlLinks } from "../logic/html.ts";
import { rangeOf } from "./common.ts";

const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

export class LusiaDocumentLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const text = document.getText();
    return [
      ...htmlLinks(text).flatMap((link) => htmlLink(document, link.target, link.range)),
      ...cssLinks(text, document.fileName).map((link) => fileLink(document, link.path, link.range)),
    ];
  }
}

function htmlLink(
  document: vscode.TextDocument,
  target: string,
  range: { start: number; end: number },
): vscode.DocumentLink[] {
  if (target.startsWith("#")) return [];
  if (EXTERNAL.test(target))
    return [new vscode.DocumentLink(rangeOf(document, range), vscode.Uri.parse(target))];
  return [fileLink(document, resolve(dirname(document.fileName), target), range)];
}

function fileLink(
  document: vscode.TextDocument,
  path: string,
  range: { start: number; end: number },
): vscode.DocumentLink {
  const link = new vscode.DocumentLink(rangeOf(document, range), vscode.Uri.file(path));
  link.tooltip = path;
  return link;
}
