import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssCompletions } from "../logic/css.ts";
import { htmlCompletions } from "../logic/html.ts";
import type { CompletionKind } from "../../../shared/completion-data.ts";
import { completionsAt, type CompletionResult } from "../../../shared/completions.ts";
import type { TextEdit } from "../../../shared/auto-import.ts";
import { completionMarkdown } from "../../../shared/markdown.ts";
import type { TsProject } from "../ts/project.ts";
import type { TsCompletion } from "../ts/types.ts";
import { inTsRegion, projectOf, rangeOf } from "./common.ts";

const KINDS: Record<CompletionKind, vscode.CompletionItemKind> = {
  function: vscode.CompletionItemKind.Function,
  type: vscode.CompletionItemKind.Interface,
  class: vscode.CompletionItemKind.Class,
  property: vscode.CompletionItemKind.Property,
  keyword: vscode.CompletionItemKind.Keyword,
  snippet: vscode.CompletionItemKind.Snippet,
  variable: vscode.CompletionItemKind.Variable,
};

interface TsData {
  fileName: string;
  offset: number;
  name: string;
  source?: string;
}

// A completion item carries its TypeScript source through the editor's resolve round trip.
interface TsItem extends vscode.CompletionItem {
  data?: TsData;
}

export class LusiaCompletionProvider implements vscode.CompletionItemProvider<TsItem> {
  private readonly projects = new Map<string, TsProject>();

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): TsItem[] {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const propsOf = (name: string) => componentProps(document.fileName, text, name);
    const symbolsOf = (specifier: string) => scriptSymbols(document.fileName, specifier);
    const base = completionsAt(text, offset, propsOf, symbolsOf);
    const extra = [
      ...htmlCompletions(text, offset),
      ...cssCompletions(text, offset, document.fileName),
    ];
    const labels = new Set(base.map((item) => item.label));
    const ts = inTsRegion(text, offset) ? this.tsItems(document, offset) : [];
    const tsItems: TsItem[] = [];
    for (const item of ts) {
      if (labels.has(item.name)) continue;
      labels.add(item.name);
      tsItems.push(tsItem(document, offset, item));
    }
    const extras = extra.filter((item) => !labels.has(item.label));
    return [
      ...base.map((item) => toItem(document, item)),
      ...tsItems,
      ...extras.map((item) => toItem(document, item)),
    ];
  }

  resolveCompletionItem(item: TsItem): TsItem {
    const data = item.data;
    if (!data) return item;
    const details = this.projects
      .get(data.fileName)
      ?.completionDetails(data.offset, data.name, data.source);
    if (details?.detail) item.detail = details.detail;
    if (details?.documentation)
      item.documentation = new vscode.MarkdownString(details.documentation);
    return item;
  }

  private tsItems(document: vscode.TextDocument, offset: number): TsCompletion[] {
    const project = projectOf(document);
    this.projects.set(document.fileName, project);
    return project.completions(offset);
  }
}

function tsItem(document: vscode.TextDocument, offset: number, data: TsCompletion): TsItem {
  const item: TsItem = new vscode.CompletionItem(data.name, KINDS[data.kind]);
  item.insertText = data.insertText;
  item.sortText = data.sortText;
  if (data.range) item.range = rangeOf(document, data.range);
  item.data = {
    fileName: document.fileName,
    offset,
    name: data.name,
    source: data.source,
  } satisfies TsData;
  return item;
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
