import { closingQuote } from "./object-literal.ts";

export interface ProtectedMarkup {
  text: string;
  expressions: string[];
}

const QUOTES = new Set(["'", '"', "`"]);
const PLACEHOLDER_PATTERN = /LUCIAEXPR(\d+)X/g;
const ATTRIBUTE_PLACEHOLDER = /="LUCIAEXPR(\d+)X"/g;
const BARE_ATTRIBUTE_PLACEHOLDER = /=LUCIAEXPR(\d+)X/g;

const FLOW_OPEN = /<(?:IF|ELSEIF|ELSE|EACH|FOR|CONTENT|HTML)(?=[\s/>])/y;
const FLOW_CLOSE = /<\/(?:IF|ELSEIF|ELSE|EACH|FOR|HTML)\s*>/y;

/** Swaps each `{expr}` and each flow tag for a placeholder that the HTML formatter leaves alone. */
export function protectExpressions(markup: string): ProtectedMarkup {
  const expressions: string[] = [];
  let text = "";
  let i = 0;
  while (i < markup.length) {
    const end = protectedEnd(markup, i);
    if (end === -1) {
      text += markup.charAt(i);
      i++;
    } else {
      text += placeholder(expressions.length);
      expressions.push(markup.slice(i, end + 1));
      i = end + 1;
    }
  }
  return { text, expressions };
}

/** Puts the expressions back. A placeholder that the formatter quoted as a whole attribute value loses the quotes. */
export function restoreExpressions(html: string, expressions: string[]): string {
  const restored = html
    .replace(
      ATTRIBUTE_PLACEHOLDER,
      (_match, index: string) => `=${expressionAt(expressions, index)}`,
    )
    .replace(
      BARE_ATTRIBUTE_PLACEHOLDER,
      (_match, index: string) => `=${expressionAt(expressions, index)}`,
    );
  return restored.replace(PLACEHOLDER_PATTERN, (_match, index: string) =>
    expressionAt(expressions, index),
  );
}

/** The last index of the protected span that starts at `i` (an expression or a flow tag), or -1. */
function protectedEnd(markup: string, i: number): number {
  const ch = markup.charAt(i);
  if (ch === "{") return expressionEnd(markup, i);
  if (ch === "<") return flowTagEnd(markup, i);
  return -1;
}

/** The index of the `>` that ends a flow tag at `start`, or -1. Expressions inside it are skipped. */
function flowTagEnd(markup: string, start: number): number {
  FLOW_CLOSE.lastIndex = start;
  const close = FLOW_CLOSE.exec(markup);
  if (close) return start + close[0].length - 1;
  FLOW_OPEN.lastIndex = start;
  if (!FLOW_OPEN.test(markup)) return -1;
  for (let i = start; i < markup.length; i++) {
    const ch = markup.charAt(i);
    if (QUOTES.has(ch)) i = closingQuote(markup, i);
    else if (ch === "{") {
      i = expressionEnd(markup, i);
      if (i === -1) return -1;
    } else if (ch === ">") return i;
  }
  return -1;
}

/** The index of the `}` that closes the `{` at `open`, or -1. */
export function expressionEnd(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text.charAt(i);
    if (QUOTES.has(ch)) i = closingQuote(text, i);
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return -1;
}

function placeholder(index: number): string {
  return `LUCIAEXPR${index}X`;
}

function expressionAt(expressions: string[], index: string): string {
  return expressions[Number(index)] ?? "";
}
