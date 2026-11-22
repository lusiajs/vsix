import * as vscode from "vscode";
import type { LintFix, LintIssue } from "lusiajs/language/lint/lint.ts";
import type { LusiaHost } from "./host/types.ts";
import { declaredProps } from "./component-file.ts";
import { cssDiagnostics, type CssDiagnosticSeverity } from "./logic/css.ts";
import type { RegionDiagnostic } from "./logic/html.ts";
import { TsProject } from "./ts/project.ts";

export type SourceName = "lusia" | "lusia-lint" | "typescript" | "html" | "css";

export type SourceDiagnostics = Partial<Record<SourceName, vscode.Diagnostic[]>>;

const SEVERITIES: Record<CssDiagnosticSeverity, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  information: vscode.DiagnosticSeverity.Information,
  hint: vscode.DiagnosticSeverity.Hint,
};

export function compileDiagnostics(
  host: LusiaHost,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  try {
    host.compiler.compile(document.getText(), document.fileName);
    return [];
  } catch (error) {
    const { line, column, message } = host.errorPosition.errorPosition(error);
    const range = lineRange(document, line - 1, column - 1);
    return [diagnostic(range, message, vscode.DiagnosticSeverity.Error, "lusia")];
  }
}

export function lintIssues(host: LusiaHost, document: vscode.TextDocument): LintIssue[] {
  const text = document.getText();
  return host.lint.lintLusia(text, (name) => declaredProps(host, document.fileName, text, name));
}

export function lintDiagnostics(
  host: LusiaHost,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  return lintIssues(host, document).map((issue) => lintDiagnostic(document, issue));
}

export function typeScriptDiagnostics(
  host: LusiaHost,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const project = TsProject.open(host, document.fileName, document.getText());
  return project
    .diagnostics()
    .map((issue) =>
      fromOffsets(
        document,
        issue.start,
        issue.end,
        issue.message,
        issue.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
        "typescript",
        issue.code,
      ),
    );
}

export function cssSourceDiagnostics(
  host: LusiaHost,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  return cssDiagnostics(host, document.getText()).map((item) =>
    fromOffsets(
      document,
      item.range.start,
      item.range.end,
      item.message,
      SEVERITIES[item.severity],
      "css",
      item.code,
    ),
  );
}

export function htmlSourceDiagnostics(
  document: vscode.TextDocument,
  issues: RegionDiagnostic[],
): vscode.Diagnostic[] {
  return issues.map((item) =>
    fromOffsets(
      document,
      item.start,
      item.end,
      item.message,
      item.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning,
      "html",
      item.code,
    ),
  );
}

function fromOffsets(
  document: vscode.TextDocument,
  start: number,
  end: number,
  message: string,
  severity: vscode.DiagnosticSeverity,
  source: SourceName,
  code?: string | number,
): vscode.Diagnostic {
  return diagnostic(offsetRange(document, start, end), message, severity, source, code);
}

function diagnostic(
  range: vscode.Range,
  message: string,
  severity: vscode.DiagnosticSeverity,
  source: SourceName,
  code?: string | number,
): vscode.Diagnostic {
  const item = new vscode.Diagnostic(range, message, severity);
  item.source = source;
  if (code !== undefined) item.code = code;
  return item;
}

function lintDiagnostic(document: vscode.TextDocument, issue: LintIssue): vscode.Diagnostic {
  const range = lineRange(document, issue.line - 1, issue.column - 1);
  const item = diagnostic(
    range,
    issue.message,
    issue.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning,
    "lusia-lint",
    issue.code,
  );
  // The API types no longer expose `data`, but the editor keeps it when it hands a diagnostic back.
  if (issue.fix) (item as vscode.Diagnostic & { data?: LintFix }).data = issue.fix;
  return item;
}

function offsetRange(document: vscode.TextDocument, start: number, end: number): vscode.Range {
  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

/** From a column to the end of its line. Line and column are 0-based here. */
function lineRange(document: vscode.TextDocument, line: number, column: number): vscode.Range {
  const lineIndex = Math.min(Math.max(line, 0), document.lineCount - 1);
  const start = new vscode.Position(lineIndex, Math.max(column, 0));
  return new vscode.Range(start, document.lineAt(lineIndex).range.end);
}
