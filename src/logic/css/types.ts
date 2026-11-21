import type { TextRange } from "../../../../../src/editor/range.ts";

export type CssDiagnosticSeverity = "error" | "warning" | "information" | "hint";

export interface CssDiagnostic {
  message: string;
  severity: CssDiagnosticSeverity;
  /** Document offsets. */
  range: TextRange;
  /** The language service rule id, such as `unknownProperties`. */
  code?: string;
}

export interface CssLocation {
  /** Document offsets, in the component or in `path`. */
  range: TextRange;
  /** An absolute path when the target is in another file; the open component otherwise. */
  path?: string;
}

export type CssSymbolKind =
  "variable" | "function" | "mixin" | "class" | "property" | "selector" | "other";

export interface CssSymbol {
  name: string;
  kind: CssSymbolKind;
  /** Document offsets. */
  range: TextRange;
  /** The name only, document offsets. */
  selectionRange: TextRange;
  children?: CssSymbol[];
}

export interface CssLink {
  /** The quoted path inside `@use`, `@forward` or `@import`, quotes excluded. */
  range: TextRange;
  /** The absolute path of the imported file. */
  path: string;
}

export interface CssFoldingRange {
  /** Document offsets; the range folds between them. */
  start: number;
  end: number;
  kind?: "comment" | "imports" | "region";
}

export interface CssSelectionRange {
  range: TextRange;
  parent?: CssSelectionRange;
}

export interface CssColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface CssColorInformation {
  range: TextRange;
  color: CssColor;
}

export interface CssTextEdit {
  range: TextRange;
  newText: string;
}

export interface CssColorPresentation {
  label: string;
  edit: CssTextEdit;
  additionalEdits?: CssTextEdit[];
}

export interface CssCodeAction {
  title: string;
  kind?: string;
  diagnostics?: CssDiagnostic[];
  /** Document offsets in the component. Absent when the action only carries a command. */
  edits?: CssTextEdit[];
}

export interface CssFileEdit {
  /** An absolute path for another file; the open component when omitted. */
  path?: string;
  edits: CssTextEdit[];
}
