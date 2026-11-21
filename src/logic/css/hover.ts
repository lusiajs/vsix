import type { HoverResult } from "../../../../../src/editor/hover.ts";
import type { TextRange } from "../../../../../src/editor/range.ts";
import { hoverText, offsetRange } from "../language-service.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import { memberHover, scssMemberAt } from "./scss/find.ts";
import { buildScssIndex } from "./scss/index.ts";

export function cssHover(text: string, offset: number, fileName?: string): HoverResult | undefined {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return undefined;
    const official = officialHover(style);
    const hit = memberAt(style, fileName, offset);
    if (hit && (!official || startsBefore(official.range, hit.range))) {
      return { kind: "markdown", markdown: memberHover(hit.member), range: hit.range };
    }
    return official;
  } catch {
    return undefined;
  }
}

function officialHover(style: StyleContext): HoverResult | undefined {
  const stylesheet = style.service.parseStylesheet(style.document);
  const hover = style.service.doHover(style.document, style.position, stylesheet);
  const markdown = hoverText(hover);
  if (!markdown) return undefined;
  const range = offsetRange(style.document, hover?.range);
  return {
    kind: "markdown",
    markdown,
    range: range && shift(range, style.section.contentStart),
  };
}

function memberAt(style: StyleContext, fileName: string | undefined, offset: number) {
  if (style.language !== "scss") return undefined;
  const index = buildScssIndex(fileName, style.content);
  if (index.members.length === 0) return undefined;
  return scssMemberAt(index, style.content, style.section.contentStart, offset);
}

/** The service reports the declaration when the cursor is on a member it does not know. */
function startsBefore(outer: TextRange | undefined, inner: TextRange): boolean {
  return !outer || outer.start < inner.start;
}
