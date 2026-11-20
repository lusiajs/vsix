import type { CompletionKind } from "../../../shared/completion-data.ts";
import type { TextRange } from "../../../shared/range.ts";

export interface TsCompletion {
  name: string;
  insertText: string;
  kind: CompletionKind;
  sortText: string;
  source?: string;
  range?: TextRange;
  hasAction: boolean;
  detail?: string;
  documentation?: string;
}

export interface TsCompletionDetails extends TsCompletion {
  codeActions: number;
}

export interface TsHover {
  markdown: string;
  range: TextRange;
}

export interface TsIssue {
  start: number;
  end: number;
  message: string;
  code: number;
  severity: "error" | "warning";
}

export interface TsLocation {
  fileName: string;
  start: number;
}

export interface TsEdit {
  fileName: string;
  start: number;
  end: number;
  text: string;
}

export interface TsSignature {
  label: string;
  documentation: string;
  parameters: Array<{ label: string; documentation: string }>;
  activeParameter: number;
}
