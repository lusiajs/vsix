import type { CompletionKind } from "lusiajs/editor/completion-data.ts";
import type { TextRange } from "lusiajs/editor/range.ts";

export interface TsCompletion {
  name: string;
  insertText: string;
  kind: CompletionKind;
  sortText: string;
  source?: string;
  range?: TextRange;
  hasAction: boolean;
  /** TypeScript's opaque completion data, which `getCompletionEntryDetails` needs back. */
  entryData?: unknown;
  detail?: string;
  documentation?: string;
}

export interface TsImportEdit {
  /** Offsets in the open `.lusia` source. */
  start: number;
  end: number;
  text: string;
}

export interface TsCompletionDetails extends TsCompletion {
  codeActions: number;
  /** The text edits of the completion's code actions, such as adding a missing import. */
  importEdits: TsImportEdit[];
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
