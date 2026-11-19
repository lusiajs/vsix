import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import type { CompletionKind } from "../logic/completion-data.ts";
import { completionsAt, type CompletionResult } from "../logic/completions.ts";
import type { TextEdit } from "../logic/auto-import.ts";

const KINDS: Record<CompletionKind, vscode.CompletionItemKind> = {
  function: vscode.CompletionItemKind.Function,
  type: vscode.CompletionItemKind.Interface,
  class: vscode.CompletionItemKind.Class,
  property: vscode.CompletionItemKind.Property,
  keyword: vscode.CompletionItemKind.Keyword,
  snippet: vscode.CompletionItemKind.Snippet,
  variable: vscode.CompletionItemKind.Variable,
};

export class LuciaCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const text = document.getText();
    const lookup = (name: string) => componentProps(document.fileName, text, name);
    return completionsAt(text, document.offsetAt(position), lookup).map((data) => toItem(document, data));
  }
}

function toItem(document: vscode.TextDocument, data: CompletionResult): vscode.CompletionItem {
  const item = new vscode.CompletionItem(data.label, KINDS[data.kind]);
  item.insertText = data.snippet ? new vscode.SnippetString(data.insertText) : data.insertText;
  item.detail = data.detail;
  if (data.importEdit) item.additionalTextEdits = [importEdit(document, data.importEdit)];
  return item;
}

function importEdit(document: vscode.TextDocument, edit: TextEdit): vscode.TextEdit {
  const range = new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end));
  return vscode.TextEdit.replace(range, edit.text);
}
