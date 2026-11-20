import type { ColorPresentation } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import { offsetRange, type LspRange } from "../language-service.ts";
import { shift, styleContextAt, styleSections, type StyleContext } from "./context.ts";
import type { CssColorInformation, CssColorPresentation } from "./types.ts";

export function cssColors(text: string): CssColorInformation[] {
  const colors: CssColorInformation[] = [];
  for (const style of styleSections(text)) {
    let found;
    try {
      const stylesheet = style.service.parseStylesheet(style.document);
      found = style.service.findDocumentColors(style.document, stylesheet);
    } catch {
      continue;
    }
    for (const info of found) {
      const range = offsetRange(style.document, info.range);
      if (!range) continue;
      colors.push({ range: shift(range, style.section.contentStart), color: { ...info.color } });
    }
  }
  return colors;
}

export function cssColorPresentations(text: string, offset: number): CssColorPresentation[] {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return [];
    const stylesheet = style.service.parseStylesheet(style.document);
    const local = offset - style.section.contentStart;
    const target = style.service.findDocumentColors(style.document, stylesheet).find((info) => {
      const range = offsetRange(style.document, info.range);
      return range !== undefined && local >= range.start && local <= range.end;
    });
    if (!target) return [];
    return style.service
      .getColorPresentations(style.document, stylesheet, target.color, target.range)
      .map((presentation) => toPresentation(presentation, style, target.range));
  } catch {
    return [];
  }
}

function toPresentation(
  presentation: ColorPresentation,
  style: StyleContext,
  fallback: LspRange,
): CssColorPresentation {
  const edit = presentation.textEdit;
  return {
    label: presentation.label,
    edit: {
      range: shift(editRange(style, edit?.range ?? fallback), style.section.contentStart),
      newText: edit?.newText ?? presentation.label,
    },
    additionalEdits: presentation.additionalTextEdits?.map((additional) => ({
      range: shift(editRange(style, additional.range), style.section.contentStart),
      newText: additional.newText,
    })),
  };
}

function editRange(style: StyleContext, range: LspRange) {
  return offsetRange(style.document, range) ?? { start: 0, end: 0 };
}
