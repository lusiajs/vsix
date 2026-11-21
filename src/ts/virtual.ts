import { findSections } from "lusia/language/parse/sections.ts";
import { collectFlowNames, type FlowName } from "./flow-tags.ts";
import { afterQuote, commentEnd, expressionEnd, unclosedEnd } from "./scan.ts";
import type { TextRange } from "lusia/editor/range.ts";

export interface VirtualScript {
  text: string;
  scriptSpans: TextRange[];
  expressionSpans: TextRange[];
  flowNames: FlowName[];
}

interface Expression {
  open: number;
  end: number;
  closed: boolean;
}

const LINE_BREAKS = /^[\r\n]*$/;

/** Same length and line breaks; markup and style become blanks, so offsets never move. */
export function virtualScript(source: string): VirtualScript {
  const sections = findSections(source);
  const chars = blanked(source);
  const scriptSpans = sections
    .filter((section) => section.kind === "script")
    .map((section) => ({ start: section.contentStart, end: section.contentEnd }));
  for (const span of scriptSpans) copy(chars, source, span.start, span.end);
  const expressions = collectExpressions(source, sections);
  renderExpressions(chars, source, expressions);
  return {
    text: chars.join(""),
    scriptSpans,
    expressionSpans: expressions
      .filter((expression) => expression.end > expression.open + 1)
      .map((expression) => ({ start: expression.open + 1, end: expression.end })),
    flowNames: collectFlowNames(source, sections),
  };
}

function blanked(source: string): string[] {
  const chars = source.split("");
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (ch !== "\n" && ch !== "\r") chars[i] = " ";
  }
  return chars;
}

function copy(chars: string[], source: string, from: number, to: number): void {
  for (let i = from; i < to; i++) chars[i] = source.charAt(i);
}

function collectExpressions(
  source: string,
  sections: ReturnType<typeof findSections>,
): Expression[] {
  const expressions: Expression[] = [];
  let section = 0;
  let inTag = false;
  let i = 0;
  while (i < source.length) {
    while (sections[section] !== undefined && i >= sections[section]!.end) section++;
    const current = sections[section];
    if (current && i >= current.openStart) {
      i = current.end;
      continue;
    }
    const ch = source.charAt(i);
    if (inTag) {
      if (ch === '"' || ch === "'") i = afterQuote(source, i);
      else if (ch === ">") {
        inTag = false;
        i++;
      } else if (ch === "{") i = readExpression(source, i, expressions);
      else i++;
      continue;
    }
    if (ch === "<") {
      if (source.startsWith("<!--", i)) i = commentEnd(source, i);
      else {
        inTag = true;
        i++;
      }
      continue;
    }
    if (ch === "{") i = readExpression(source, i, expressions);
    else i++;
  }
  return expressions;
}

function readExpression(source: string, open: number, expressions: Expression[]): number {
  const close = expressionEnd(source, open);
  const leaked = close !== -1 && source.slice(open + 1, close).includes("</");
  if (close === -1 || leaked) {
    const end = unclosedEnd(source, open);
    expressions.push({ open, end, closed: false });
    return Math.max(end, open + 1);
  }
  expressions.push({ open, end: close, closed: true });
  return close + 1;
}

function renderExpressions(chars: string[], source: string, expressions: Expression[]): void {
  let previous: Expression | undefined;
  for (const expression of expressions) {
    if (!expression.closed) {
      chars[expression.open] = ";";
      copy(chars, source, expression.open + 1, expression.end);
      previous = undefined;
      continue;
    }
    chars[expression.end] = ")";
    copy(chars, source, expression.open + 1, expression.end);
    if (previous !== undefined && joinable(source, previous.end, expression.open)) {
      chars[previous.end] = ",";
      chars[expression.open] = " ";
    } else {
      chars[expression.open] = "(";
      separate(chars, expression.open);
    }
    previous = expression;
  }
}

/** True when two expressions can share one parenthesized list because no `;` fits between them. */
function joinable(source: string, previousEnd: number, open: number): boolean {
  const gap = source.slice(previousEnd + 1, open);
  return gap.length === 0 || LINE_BREAKS.test(gap);
}

/** Puts a `;` in the nearest blank cell before an expression, so two lists never become a call. */
function separate(chars: string[], open: number): void {
  for (let i = open - 1; i >= 0; i--) {
    const ch = chars[i]!;
    if (ch === "\n" || ch === "\r") continue;
    if (ch === " " || ch === "\t") chars[i] = ";";
    break;
  }
}
