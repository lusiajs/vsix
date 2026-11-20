import type { SelectionRange } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import { offsetRange } from "../language-service.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import type { CssSelectionRange } from "./types.ts";

/** The selection chain for each offset, innermost first; nothing outside a style block. */
export function cssSelection(
  text: string,
  offsets: number[],
): Array<CssSelectionRange | undefined> {
  return offsets.map((offset) => selectionAt(text, offset));
}

function selectionAt(text: string, offset: number): CssSelectionRange | undefined {
  try {
    const style = styleContextAt(text, offset);
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

function toSelection(selection: SelectionRange, style: StyleContext): CssSelectionRange {
  const range = offsetRange(style.document, selection.range);
  return {
    range: range ? shift(range, style.section.contentStart) : { start: 0, end: 0 },
    parent: selection.parent ? toSelection(selection.parent, style) : undefined,
  };
}
