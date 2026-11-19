const QUOTES = new Set(["'", '"', "`"]);
const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

/** The trimmed entries of the object literal whose `{` is at `open`. */
export function objectEntries(source: string, open: number): string[] {
  const entries: string[] = [];
  let depth = 0;
  let entryStart = open + 1;
  for (let i = open + 1; i < source.length; i++) {
    const ch = source.charAt(i);
    if (QUOTES.has(ch)) {
      i = closingQuote(source, i);
    } else if (OPENERS.has(ch)) {
      depth++;
    } else if (CLOSERS.has(ch) && depth > 0) {
      depth--;
    } else if (ch === "," && depth === 0) {
      entries.push(source.slice(entryStart, i));
      entryStart = i + 1;
    } else if (ch === "}" && depth === 0) {
      entries.push(source.slice(entryStart, i));
      break;
    }
  }
  return entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

/** The index of the quote that closes the string opened at `start`. */
export function closingQuote(source: string, start: number): number {
  const quote = source.charAt(start);
  for (let i = start + 1; i < source.length; i++) {
    if (source.charAt(i) === "\\") i++;
    else if (source.charAt(i) === quote) return i;
  }
  return source.length;
}
