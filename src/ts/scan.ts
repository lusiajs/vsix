const EXPRESSION_QUOTES: ReadonlySet<string> = new Set(["'", '"', "`"]);

/** The index just past the quoted run at `start`, or the end of the text when it never closes. */
export function afterQuote(source: string, start: number): number {
  const quote = source.charAt(start);
  for (let i = start + 1; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === quote) return i + 1;
  }
  return source.length;
}

/** The index of the `}` closing the `{` at `open`, or -1 when there is none. */
export function expressionEnd(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source.charAt(i);
    if (EXPRESSION_QUOTES.has(ch)) {
      i = afterQuote(source, i) - 1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return -1;
}

/** The index of the `>` ending the tag that starts at `start`, or -1 when it never closes. */
export function tagEnd(source: string, start: number): number {
  for (let i = start; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === '"' || ch === "'") {
      i = afterQuote(source, i) - 1;
      continue;
    }
    if (ch === "{") {
      const end = expressionEnd(source, i);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (ch === ">") return i;
  }
  return -1;
}

/** The index of the line break ending the line at `from`, or the end of the text. */
export function lineEnd(source: string, from: number): number {
  const index = source.indexOf("\n", from);
  return index === -1 ? source.length : index;
}

/**
 * Where an unclosed expression stops. Markup after it is not code, so a tag ends the guess.
 */
export function unclosedEnd(source: string, open: number): number {
  const stop = lineEnd(source, open + 1);
  for (let i = open + 1; i < stop; i++) {
    const next = source.charAt(i + 1);
    if (source.charAt(i) === "<" && (next === "/" || next === "!" || /[A-Za-z]/.test(next))) {
      return i;
    }
  }
  return stop;
}

/** The index just past the HTML comment that starts at `start`. */
export function commentEnd(source: string, start: number): number {
  const index = source.indexOf("-->", start + 4);
  return index === -1 ? source.length : index + 3;
}
