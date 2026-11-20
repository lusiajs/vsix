import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssCompletions } from "../logic/css.ts";
import { htmlCompletions } from "../logic/html.ts";
import type { CompletionKind } from "../../../shared/completion-data.ts";
import { completionsAt, type CompletionResult } from "../../../shared/completions.ts";
import type { TextEdit } from "../../../shared/auto-import.ts";
import type { TextRange } from "../../../shared/range.ts";
import { completionMarkdown } from "../../../shared/markdown.ts";

const KINDS: Record<CompletionKind, vscode.CompletionItemKind> = {
  function: vscode.CompletionItemKind.Function,
  type: vscode.CompletionItemKind.Interface,
  class: vscode.CompletionItemKind.Class,
  property: vscode.CompletionItemKind.Property,
  keyword: vscode.CompletionItemKind.Keyword,
  snippet: vscode.CompletionItemKind.Snippet,
  variable: vscode.CompletionItemKind.Variable,
};

export class LusiaCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) => componentProps(document.fileName, text, name);
    const symbolsOf = (specifier: string) => scriptSymbols(document.fileName, specifier);
    const base = completionsAt(text, offset, propsOf, symbolsOf);
    const extra = [...htmlCompletions(text, offset), ...cssCompletions(text, offset)];
    return [...base, ...newItems(base, extra)].map((data) => toItem(document, data));
  }
}

function newItems(base: CompletionResult[], extra: CompletionResult[]): CompletionResult[] {
  const labels = new Set(base.map((item) => item.label));
  return extra.filter((item) => !labels.has(item.label));
}

function toItem(document: vscode.TextDocument, data: CompletionResult): vscode.CompletionItem {
  const item = new vscode.CompletionItem(data.label, KINDS[data.kind]);
  item.insertText = data.snippet ? new vscode.SnippetString(data.insertText) : data.insertText;
  item.detail = data.detail;
  const documentation = completionMarkdown(data);
  if (documentation !== undefined) item.documentation = new vscode.MarkdownString(documentation);
  if (data.range) item.range = rangeOf(document, data.range);
  if (data.importEdit) item.additionalTextEdits = [importEdit(document, data.importEdit)];
  return item;
}

function importEdit(document: vscode.TextDocument, edit: TextEdit): vscode.TextEdit {
  return vscode.TextEdit.replace(rangeOf(document, edit), edit.text);
}

function rangeOf(document: vscode.TextDocument, range: TextRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}
