import { DiagnosticSeverity } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type {
  CodeAction,
  Diagnostic,
  TextEdit,
  WorkspaceEdit,
} from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import type { CssCodeAction, CssDiagnostic, CssDiagnosticSeverity, CssTextEdit } from "./types.ts";

const SEVERITIES: Record<CssDiagnosticSeverity, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  information: DiagnosticSeverity.Information,
  hint: DiagnosticSeverity.Hint,
};

export function cssCodeActions(
  text: string,
  start: number,
  end: number,
  diagnostics: CssDiagnostic[],
): CssCodeAction[] {
  try {
    const style = styleContextAt(text, start);
    if (!style) return [];
    const stylesheet = style.service.parseStylesheet(style.document);
    const context = { diagnostics: localDiagnostics(diagnostics, style) };
    const range = {
      start: style.document.positionAt(Math.max(start - style.section.contentStart, 0)),
      end: style.document.positionAt(Math.max(end - style.section.contentStart, 0)),
    };
    return style.service
      .doCodeActions2(style.document, range, context, stylesheet)
      .map((action) => toAction(action, style));
  } catch {
    return [];
  }
}

function toAction(action: CodeAction, style: StyleContext): CssCodeAction {
  const edits = editsOf(action.edit, style);
  return {
    title: action.title,
    kind: action.kind,
    edits: edits.length > 0 ? edits : undefined,
  };
}

function localDiagnostics(diagnostics: CssDiagnostic[], style: StyleContext): Diagnostic[] {
  const { contentStart, contentEnd } = style.section;
  return diagnostics
    .filter(
      (diagnostic) => diagnostic.range.start >= contentStart && diagnostic.range.end <= contentEnd,
    )
    .map((diagnostic) => ({
      message: diagnostic.message,
      severity: SEVERITIES[diagnostic.severity],
      code: diagnostic.code,
      range: {
        start: style.document.positionAt(diagnostic.range.start - contentStart),
        end: style.document.positionAt(diagnostic.range.end - contentStart),
      },
    }));
}

function editsOf(edit: WorkspaceEdit | undefined, style: StyleContext): CssTextEdit[] {
  if (!edit) return [];
  const edits: TextEdit[] = [];
  for (const change of edit.documentChanges ?? []) {
    if ("textDocument" in change && change.textDocument.uri === style.document.uri) {
      edits.push(...change.edits);
    }
  }
  for (const change of edit.changes?.[style.document.uri] ?? []) edits.push(change);
  return edits.map((change) => ({
    range: shift(
      {
        start: style.document.offsetAt(change.range.start),
        end: style.document.offsetAt(change.range.end),
      },
      style.section.contentStart,
    ),
    newText: change.newText,
  }));
}
