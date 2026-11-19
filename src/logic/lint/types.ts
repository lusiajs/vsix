import type { PropDef } from "../props.ts";

export type Severity = "warning" | "error";

/** A rule's result. `offset` points into the source. */
export interface LintFinding {
  offset: number;
  code: string;
  message: string;
  severity: Severity;
}

/** What the editor shows. `line` and `column` are 1-based. */
export interface LintIssue {
  line: number;
  column: number;
  message: string;
  severity: Severity;
  code: string;
}

export interface LintContext {
  source: string;
  /** Script text, and where it starts in the source. */
  script: string;
  scriptOffset: number;
  /** The source with script and style content blanked, so offsets still match. */
  markup: string;
  childProps(name: string): PropDef[] | undefined;
}

export type LintRule = (context: LintContext) => LintFinding[];
