import { closingQuote } from "../object-literal.ts";
import { expressionEnd } from "../format-expressions.ts";

/** `none` for a bare name, `static` for `name="..."`, `expression` for `name={...}`. */
export type AttributeValue = "none" | "static" | "expression";

export interface AttributeName {
  name: string;
  /** Offset in the same text the tag came from. */
  offset: number;
  value: AttributeValue;
}

const ATTRIBUTE_NAME = /[A-Za-z_:][\w:.-]*/g;
const UNQUOTED_VALUE = /[^\s"'{/>]+/y;
const EQUALS_AND_NEXT = /^\s*=\s*(\S?)/;

/** The attribute names of the start tag whose name ends at `nameEnd`. */
export function tagAttributes(markup: string, nameEnd: number): AttributeName[] {
  const end = tagEnd(markup, nameEnd);
  const attrs = markup.slice(nameEnd, end);
  const masked = maskValues(attrs);
  return [...masked.matchAll(ATTRIBUTE_NAME)].map((match) => ({
    name: match[0],
    offset: nameEnd + match.index,
    value: valueKindAfter(attrs.slice(match.index + match[0].length)),
  }));
}

function valueKindAfter(rest: string): AttributeValue {
  const next = EQUALS_AND_NEXT.exec(rest);
  if (!next) return "none";
  return next[1] === "{" ? "expression" : "static";
}

/** The index of the `>` that closes the tag, skipping quoted values and expressions. */
function tagEnd(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === '"' || ch === "'") i = closingQuote(text, i);
    else if (ch === "{") i = expressionLast(text, i);
    else if (ch === ">") return i;
  }
  return text.length;
}

/** The last index of the expression at `open`; the end of the text when it never closes. */
function expressionLast(text: string, open: number): number {
  const end = expressionEnd(text, open);
  return end === -1 ? text.length : end;
}

// Blanks quoted values, expressions and unquoted values, so only attribute names remain.
function maskValues(attrs: string): string {
  let out = "";
  let i = 0;
  while (i < attrs.length) {
    const end = valueEnd(attrs, i);
    if (end === -1) {
      out += attrs.charAt(i);
      i++;
    } else {
      out += " ".repeat(end - i);
      i = end;
    }
  }
  return out;
}

function valueEnd(attrs: string, i: number): number {
  const ch = attrs.charAt(i);
  if (ch === '"' || ch === "'") return closingQuote(attrs, i) + 1;
  if (ch === "{") return expressionLast(attrs, i) + 1;
  if (ch !== "=") return -1;
  const valueStart = i + 1 + (/^\s*/.exec(attrs.slice(i + 1))?.[0].length ?? 0);
  const next = attrs.charAt(valueStart);
  if (next === '"' || next === "'" || next === "{") return -1;
  UNQUOTED_VALUE.lastIndex = valueStart;
  const unquoted = UNQUOTED_VALUE.exec(attrs);
  return unquoted ? valueStart + unquoted[0].length : -1;
}
