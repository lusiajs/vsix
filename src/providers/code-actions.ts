import * as vscode from "vscode";
import type { LintFix, LintIssue } from "lusiajs/language/lint/lint.ts";
import {
  cssCodeActions,
  cssDiagnostics,
  type CssCodeAction,
} from "../logic/css.ts";
import { lintIssues } from "../diagnostics-sources.ts";
import { animateRenameFix, isRenameMessage } from "../logic/animate-renames.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import type { LusiaHost } from "../host/types.ts";
import { rangeOf } from "./common.ts";

export class LusiaCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ): Promise<vscode.CodeAction[] | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    return [
      ...cssCodeActions(
        host,
        text,
        document.offsetAt(range.start),
        document.offsetAt(range.end),
        cssDiagnostics(host, text),
      ).map((action) => cssAction(document, action)),
      ...lintActions(host, document, context.diagnostics),
      ...renameActions(document, context.diagnostics),
    ];
  }
}

const RENAME_SOURCES: ReadonlySet<string | undefined> = new Set([
  "lusia",
  "lusia-lint",
]);

function renameActions(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];
  const text = document.getText();
  for (const diagnostic of diagnostics) {
    if (
      !RENAME_SOURCES.has(diagnostic.source) ||
      !isRenameMessage(diagnostic.message)
    )
      continue;
    const fix = animateRenameFix(
      text,
      document.offsetAt(diagnostic.range.start),
      document.offsetAt(diagnostic.range.end),
    );
    if (fix === undefined) continue;
    const title = `Rename to '${fix.text}'`;
    actions.push(replaceAction(document, diagnostic, title, fix));
  }
  return actions;
}

function replaceAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  title: string,
  fix: LintFix,
): vscode.CodeAction {
  const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    rangeOf(document, { start: fix.start, end: fix.end }),
    fix.text,
  );
  action.edit = edit;
  return action;
}

function cssAction(
  document: vscode.TextDocument,
  action: CssCodeAction,
): vscode.CodeAction {
  const item = new vscode.CodeAction(action.title, kindOf(action.kind));
  if (!action.edits) return item;
  const edit = new vscode.WorkspaceEdit();
  for (const change of action.edits) {
    edit.replace(document.uri, rangeOf(document, change.range), change.newText);
  }
  item.edit = edit;
  return item;
}

/** The editor may hand diagnostics back without extra fields, so the fix is looked up again. */
function lintActions(
  host: LusiaHost,
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.CodeAction[] {
  let issues: LintIssue[] | undefined;
  const fixOf = (diagnostic: vscode.Diagnostic): LintFix | undefined => {
    const attached = (diagnostic as vscode.Diagnostic & { data?: LintFix })
      .data;
    if (attached !== undefined) return attached;
    if (diagnostic.source !== "lusia-lint") return undefined;
    issues ??= lintIssues(host, document).filter(
      (issue) => issue.fix !== undefined,
    );
    return issues.find((issue) => sameIssue(issue, diagnostic))?.fix;
  };
  const actions: vscode.CodeAction[] = [];
  for (const diagnostic of diagnostics) {
    const fix = fixOf(diagnostic);
    if (fix === undefined) continue;
    actions.push(
      replaceAction(document, diagnostic, `Fix: ${diagnostic.message}`, fix),
    );
  }
  return actions;
}

function sameIssue(issue: LintIssue, diagnostic: vscode.Diagnostic): boolean {
  return (
    diagnostic.message === issue.message &&
    diagnostic.range.start.line === issue.line - 1 &&
    diagnostic.range.start.character === issue.column - 1
  );
}

function kindOf(kind: string | undefined): vscode.CodeActionKind {
  if (kind?.includes("refactor")) return vscode.CodeActionKind.Refactor;
  if (kind?.includes("source")) return vscode.CodeActionKind.Source;
  return vscode.CodeActionKind.QuickFix;
}
