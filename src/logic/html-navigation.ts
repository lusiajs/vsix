import type { TextRange } from "../../../shared/range.ts";
import {
  editable,
  htmlService,
  isPlainTag,
  markupHtml,
  tagNameAt,
  type TagName,
} from "./html-shared.ts";
import { offsetRange } from "./language-service.ts";
import type { RegionEdit, RegionHighlight } from "./region-types.ts";

export function htmlRename(
  text: string,
  offset: number,
  newName: string,
): RegionEdit[] | undefined {
  const tag = renameTagAt(text, offset);
  if (!tag) return undefined;
  const { document, parsed } = markupHtml(text);
  try {
    const edit = htmlService().doRename(document, document.positionAt(tag.start), newName, parsed);
    const edits = edit?.changes?.[document.uri];
    if (!edits) return undefined;
    const results: RegionEdit[] = [];
    for (const item of edits) {
      const range = offsetRange(document, item.range);
      if (range) results.push({ range, newText: item.newText });
    }
    return results.length === 0 ? undefined : results;
  } catch {
    return undefined;
  }
}

/** The tag name the rename editor selects, for plain tags only. */
export function htmlRenameRange(text: string, offset: number): TextRange | undefined {
  const tag = renameTagAt(text, offset);
  return tag ? { start: tag.start, end: tag.end } : undefined;
}

export function htmlLinkedRanges(text: string, offset: number): TextRange[] | undefined {
  if (!editable(text, offset)) return undefined;
  const { document, parsed } = markupHtml(text);
  try {
    const ranges = htmlService().findLinkedEditingRanges(
      document,
      document.positionAt(offset),
      parsed,
    );
    if (!ranges?.length) return undefined;
    const results: TextRange[] = [];
    for (const range of ranges) {
      const mapped = offsetRange(document, range);
      if (mapped) results.push(mapped);
    }
    return results.length === 0 ? undefined : results;
  } catch {
    return undefined;
  }
}

export function htmlHighlights(text: string, offset: number): RegionHighlight[] {
  if (!editable(text, offset)) return [];
  const { document, parsed } = markupHtml(text);
  try {
    const highlights = htmlService().findDocumentHighlights(
      document,
      document.positionAt(offset),
      parsed,
    );
    const results: RegionHighlight[] = [];
    for (const highlight of highlights) {
      const range = offsetRange(document, highlight.range);
      if (range) results.push({ range, kind: highlightKind(highlight.kind) });
    }
    return results;
  } catch {
    return [];
  }
}

function renameTagAt(text: string, offset: number): TagName | undefined {
  if (!editable(text, offset)) return undefined;
  const tag = tagNameAt(text, offset);
  return tag && isPlainTag(text, tag.name) ? tag : undefined;
}

function highlightKind(kind: number | undefined): RegionHighlight["kind"] {
  if (kind === 3) return "write";
  return kind === 2 ? "read" : "text";
}
