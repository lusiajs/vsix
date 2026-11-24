import type { SelectionRange } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import { offsetRange } from "../language-service.ts";
import type { LusiaHost } from "../../host/types.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import type { CssSelectionRange } from "./types.ts";

/** The selection chain for each offset, innermost first; nothing outside a style block. */
export function cssSelection(
  host: LusiaHost,
  text: string,
  offsets: number[],
): Array<CssSelectionRange | undefined> {
  return offsets.map((offset) => selectionAt(host, text, offset));
}

function selectionAt(
  host: LusiaHost,
  text: string,
  offset: number,
): CssSelectionRange | undefined {
  try {
    const style = styleContextAt(host, text, offset);
    if (!style) return undefined;
    const stylesheet = style.service.parseStylesheet(style.document);
    const [selection] = style.service.getSelectionRanges(
      style.document,
      [style.position],
      stylesheet,
    );
    return selection ? toSelection(selection, style) : undefined;
  } catch {
    return undefined;
  }
}

function toSelection(
  selection: SelectionRange,
  style: StyleContext,
): CssSelectionRange {
  const range = offsetRange(style.document, selection.range);
  return {
    range: range
      ? shift(range, style.section.contentStart)
      : { start: 0, end: 0 },
    parent: selection.parent ? toSelection(selection.parent, style) : undefined,
  };
}
