import * as vscode from "vscode";
import { componentProps } from "../component-file.ts";
import { scriptSymbols } from "../script-file.ts";
import { cssCompletions } from "../logic/css.ts";
import { htmlCompletions } from "../logic/html.ts";
import type { CompletionKind } from "../../../shared/completion-data.ts";
import { completionsAt, type CompletionResult } from "../../../shared/completions.ts";
import type { TextEdit } from "../../../shared/auto-import.ts";
import { findApiById } from "../../../shared/api-lookup.ts";
import { apiDocsMarkdown, completionMarkdown } from "../../../shared/markdown.ts";
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
  /** The reference docs to append below the TypeScript docs, when the item has an API entry. */
  apiDocs?: string;
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
    const project = inTsRegion(text, offset) ? projectOf(document) : undefined;
    if (project !== undefined) this.projects.set(document.fileName, project);
    const ts = project?.completions(offset) ?? [];
    const tsItems: TsItem[] = [];
    for (const item of ts) {
      if (labels.has(item.name)) continue;
      labels.add(item.name);
      tsItems.push(tsItem(document, offset, item));
    }
    const extras = extra.filter((item) => !labels.has(item.label));
    return [
      ...base.map((item) => toItem(document, item, apiData(document, offset, item, project))),
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
    if (!details) return item;
    if (details.detail) item.detail = details.detail;
    const documentation = [details.documentation, data.apiDocs].filter(
      (part): part is string => part !== undefined && part !== "",
    );
    if (documentation.length > 0)
      item.documentation = new vscode.MarkdownString(documentation.join("\n\n---\n\n"));
    return item;
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

function toItem(
  document: vscode.TextDocument,
  data: CompletionResult,
  resolveData?: TsData,
): TsItem {
  const item: TsItem = new vscode.CompletionItem(data.label, KINDS[data.kind]);
  item.insertText = data.snippet ? new vscode.SnippetString(data.insertText) : data.insertText;
  item.detail = data.detail;
  const documentation = completionMarkdown(data);
  if (documentation !== undefined) item.documentation = new vscode.MarkdownString(documentation);
  if (data.range) item.range = rangeOf(document, data.range);
  if (data.importEdit) item.additionalTextEdits = [importEdit(document, data.importEdit)];
  if (resolveData) item.data = resolveData;
  return item;
}

/** The resolve data for an API completion item, so the TypeScript docs can replace the table docs. */
function apiData(
  document: vscode.TextDocument,
  offset: number,
  data: CompletionResult,
  project: TsProject | undefined,
): TsData | undefined {
  if (project === undefined || data.entryId === undefined) return undefined;
  const entry = findApiById(data.entryId);
  if (!entry) return undefined;
  return {
    fileName: document.fileName,
    offset,
    name: data.label,
    apiDocs: apiDocsMarkdown(entry),
  };
}

function importEdit(document: vscode.TextDocument, edit: TextEdit): vscode.TextEdit {
  return vscode.TextEdit.replace(rangeOf(document, edit), edit.text);
}
