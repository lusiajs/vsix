import * as vscode from "vscode";
import { compile } from "../../../src/compiler/index.ts";
import { lintLucia, type LintIssue } from "./logic/lint.ts";
import { errorPosition } from "./logic/error-position.ts";

const DEBOUNCE_MS = 300;
const LINT_SOURCE = "lucia-lint";

export class LuciaDiagnostics implements vscode.Disposable {
  private readonly errors = vscode.languages.createDiagnosticCollection("lucia");
  private readonly lints = vscode.languages.createDiagnosticCollection(LINT_SOURCE);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(document: vscode.TextDocument): void {
    if (document.languageId !== "lucia") return;
    const key = document.uri.toString();
    this.cancel(key);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.check(document);
      }, DEBOUNCE_MS),
    );
  }

  clear(document: vscode.TextDocument): void {
    this.cancel(document.uri.toString());
    this.errors.delete(document.uri);
    this.lints.delete(document.uri);
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.errors.dispose();
    this.lints.dispose();
  }

  private cancel(key: string): void {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  private check(document: vscode.TextDocument): void {
    this.checkCompile(document);
    const issues = lintLucia(document.getText(), document.fileName);
    this.lints.set(
      document.uri,
      issues.map((issue) => lintDiagnostic(document, issue)),
    );
  }

  private checkCompile(document: vscode.TextDocument): void {
    try {
      compile(document.getText(), document.fileName);
      this.errors.delete(document.uri);
    } catch (error) {
      this.errors.set(document.uri, [compileDiagnostic(document, error)]);
    }
  }
}

function compileDiagnostic(document: vscode.TextDocument, error: unknown): vscode.Diagnostic {
  const { line, column, message } = errorPosition(error);
  const range = lineRange(document, line - 1, column - 1);
  return new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
}

function lintDiagnostic(document: vscode.TextDocument, issue: LintIssue): vscode.Diagnostic {
  const range = lineRange(document, issue.line - 1, issue.column - 1);
  const diagnostic = new vscode.Diagnostic(range, issue.message, vscode.DiagnosticSeverity.Warning);
  diagnostic.source = LINT_SOURCE;
  diagnostic.code = issue.code;
  return diagnostic;
}

/** From a column to the end of its line. Line and column are 0-based here. */
function lineRange(document: vscode.TextDocument, line: number, column: number): vscode.Range {
  const lineIndex = Math.min(Math.max(line, 0), document.lineCount - 1);
  const start = new vscode.Position(lineIndex, Math.max(column, 0));
  return new vscode.Range(start, document.lineAt(lineIndex).range.end);
}
