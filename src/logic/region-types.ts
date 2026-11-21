import type { TextRange } from "lusia/editor/range.ts";

export interface RegionEdit {
  range: TextRange;
  newText: string;
}

export interface RegionHighlight {
  range: TextRange;
  kind: "text" | "read" | "write";
}

export interface RegionLink {
  range: TextRange;
  target: string;
}

/** A document symbol; `kind` is a language server `SymbolKind` number. */
export interface RegionSymbol {
  name: string;
  detail?: string;
  kind: number;
  range: TextRange;
  selectionRange: TextRange;
  children: RegionSymbol[];
}

export interface RegionFolding {
  startLine: number;
  endLine: number;
  kind?: "comment" | "imports" | "region";
}

export interface RegionSelection {
  range: TextRange;
  parent?: RegionSelection;
}

export interface RegionDiagnostic {
  start: number;
  end: number;
  message: string;
  severity: "error" | "warning";
  code: string;
}
