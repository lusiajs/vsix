import { resolve } from "node:path";
import * as vscode from "vscode";
import { cssRename, cssRenameRange, type CssFileEdit } from "../logic/css.ts";
import { htmlRename, htmlRenameRange } from "../logic/html.ts";
import { inTsRegion, positionIn, projectOf, rangeOf, wordRangeAt } from "./common.ts";

export class LusiaRenameProvider implements vscode.RenameProvider {
  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
  ): vscode.WorkspaceEdit | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const edit = new vscode.WorkspaceEdit();
    if (inTsRegion(text, offset)) {
      for (const change of projectOf(document).rename(offset, newName)) {
        edit.replace(
          uriOf(document, change.fileName),
          rangeIn(document, change.fileName, change.start, change.end),
          change.text,
        );
      }
    } else {
      addMarkup(document, edit, text, offset, newName);
    }
    return edit.size > 0 ? edit : undefined;
  }

  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Range | { range: vscode.Range; placeholder: string } | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (inTsRegion(text, offset)) {
      const word = wordRangeAt(text, offset);
      return word === undefined ? undefined : placeholder(document, text, word);
    }
    const markup = htmlRenameRange(text, offset);
    if (markup) return placeholder(document, text, markup);
    const style = cssRenameRange(text, offset, document.fileName);
    return style === undefined ? undefined : placeholder(document, text, style);
  }
}

function addMarkup(
  document: vscode.TextDocument,
  edit: vscode.WorkspaceEdit,
  text: string,
  offset: number,
  newName: string,
): void {
  const markup = htmlRename(text, offset, newName);
  if (markup) {
    for (const change of markup)
      edit.replace(document.uri, rangeOf(document, change.range), change.newText);
    return;
  }
  for (const file of cssRename(text, offset, newName, document.fileName) ?? []) {
    addCssFile(document, edit, file);
  }
}

function addCssFile(
  document: vscode.TextDocument,
  edit: vscode.WorkspaceEdit,
  file: CssFileEdit,
): void {
  const fileName = file.path ?? document.fileName;
  const uri = file.path === undefined ? document.uri : vscode.Uri.file(file.path);
  for (const change of file.edits) {
    edit.replace(
      uri,
      rangeIn(document, fileName, change.range.start, change.range.end),
      change.newText,
    );
  }
}

function placeholder(
  document: vscode.TextDocument,
  text: string,
  range: { start: number; end: number },
): { range: vscode.Range; placeholder: string } {
  return { range: rangeOf(document, range), placeholder: text.slice(range.start, range.end) };
}

function uriOf(document: vscode.TextDocument, fileName: string): vscode.Uri {
  return resolve(document.fileName) === resolve(fileName)
    ? document.uri
    : vscode.Uri.file(fileName);
}

function rangeIn(
  document: vscode.TextDocument,
  fileName: string,
  start: number,
  end: number,
): vscode.Range {
  return new vscode.Range(
    positionIn(document, fileName, start),
    positionIn(document, fileName, end),
  );
}
