import * as vscode from "vscode";
import type { LintFix, LintIssue } from "lusiajs/language/lint/lint.ts";
import { cssCodeActions, cssDiagnostics, type CssCodeAction } from "../logic/css.ts";
import { lintIssues } from "../diagnostics-sources.ts";
import { rangeOf } from "./common.ts";

export class LusiaCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const text = document.getText();
    return [
      ...cssCodeActions(
        text,
        document.offsetAt(range.start),
        document.offsetAt(range.end),
        cssDiagnostics(text),
      ).map((action) => cssAction(document, action)),
      ...lintActions(document, context.diagnostics),
    ];
  }
}

function cssAction(document: vscode.TextDocument, action: CssCodeAction): vscode.CodeAction {
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
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.CodeAction[] {
  let issues: LintIssue[] | undefined;
  const fixOf = (diagnostic: vscode.Diagnostic): LintFix | undefined => {
    const attached = (diagnostic as vscode.Diagnostic & { data?: LintFix }).data;
    if (attached !== undefined) return attached;
    if (diagnostic.source !== "lusia-lint") return undefined;
    issues ??= lintIssues(document).filter((issue) => issue.fix !== undefined);
    return issues.find((issue) => sameIssue(issue, diagnostic))?.fix;
  };
  const actions: vscode.CodeAction[] = [];
  for (const diagnostic of diagnostics) {
    const fix = fixOf(diagnostic);
    if (fix === undefined) continue;
    const action = new vscode.CodeAction(
      `Fix: ${diagnostic.message}`,
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, rangeOf(document, { start: fix.start, end: fix.end }), fix.text);
    action.edit = edit;
    actions.push(action);
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
