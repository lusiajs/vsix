// The ESM build bundles; the UMD factory hides its requires from Bun.
import type { CompletionItem } from "vscode-html-languageservice/lib/esm/htmlLanguageService.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionResult } from "lusiajs/editor/completions.ts";
import type { HoverResult } from "lusiajs/editor/hover.ts";
import type { LusiaHost } from "../host/types.ts";
import {
  URI,
  editable,
  htmlService,
  isPlainTag,
  markupHtml,
  ownedTag,
  startTagNameBefore,
} from "./html-shared.ts";
import {
  editorDocument,
  hoverText,
  offsetRange,
  toCompletionKind,
} from "./language-service.ts";
import type { RegionEdit } from "./region-types.ts";

const SNIPPET_FORMAT = 2;

export { htmlDiagnostics } from "./html-diagnostics.ts";
export {
  htmlHighlights,
  htmlLinkedRanges,
  htmlRename,
  htmlRenameRange,
} from "./html-navigation.ts";
export {
  htmlFolding,
  htmlLinks,
  htmlSelection,
  htmlSymbols,
} from "./html-structure.ts";
export type {
  RegionDiagnostic,
  RegionEdit,
  RegionFolding,
  RegionHighlight,
  RegionLink,
  RegionSelection,
  RegionSymbol,
} from "./region-types.ts";

export function htmlCompletions(
  host: LusiaHost,
  text: string,
  offset: number,
): CompletionResult[] {
  if (!editable(host, text, offset)) return [];
  if (
    !host.parseTag.isTagNameTyping(text, offset) &&
    ownedTag(host, text, offset)
  )
    return [];
  const document = editorDocument(URI, "html", text);
  try {
    const htmlDocument = htmlService().parseHTMLDocument(document);
    const list = htmlService().doComplete(
      document,
      document.positionAt(offset),
      htmlDocument,
    );
    const results: CompletionResult[] = [];
    for (const item of list.items) {
      const result = completionResult(document, item);
      if (result) results.push(result);
    }
    return results;
  } catch {
    return [];
  }
}

export function htmlHover(
  host: LusiaHost,
  text: string,
  offset: number,
): HoverResult | undefined {
  if (
    !editable(host, text, offset) ||
    ownedTag(host, text, offset) ||
    !insideTag(text, offset)
  )
    return undefined;
  const document = editorDocument(URI, "html", text);
  try {
    const htmlDocument = htmlService().parseHTMLDocument(document);
    const result = htmlService().doHover(
      document,
      document.positionAt(offset),
      htmlDocument,
    );
    const markdown = hoverText(result);
    if (!result || !markdown) return undefined;
    return {
      kind: "markdown",
      markdown,
      range: offsetRange(document, result.range),
    };
  } catch {
    return undefined;
  }
}

/** The closing tag to insert after the `>` the user just typed, for plain tags. */
export function htmlTagClose(
  host: LusiaHost,
  text: string,
  offset: number,
): RegionEdit | undefined {
  if (!editable(host, text, offset) || text.charAt(offset - 1) !== ">")
    return undefined;
  const name = startTagNameBefore(text, offset);
  if (!name || !isPlainTag(host, text, name)) return undefined;
  const { document, parsed } = markupHtml(text);
  try {
    const completion = htmlService().doTagComplete(
      document,
      document.positionAt(offset),
      parsed,
    );
    if (!completion) return undefined;
    return {
      range: { start: offset, end: offset },
      newText: completion.replace("$0", ""),
    };
  } catch {
    return undefined;
  }
}

function insideTag(text: string, offset: number): boolean {
  return text.lastIndexOf("<", offset) > text.lastIndexOf(">", offset);
}

function completionResult(
  document: TextDocument,
  item: CompletionItem,
): CompletionResult | undefined {
  if (item.label === "") return undefined;
  const edit = item.textEdit;
  return {
    label: item.label,
    kind: toCompletionKind(item.kind),
    insertText: edit?.newText ?? item.insertText ?? item.label,
    snippet: item.insertTextFormat === SNIPPET_FORMAT,
    detail: item.detail,
    documentation: hoverText({ contents: item.documentation }),
    range:
      edit && "range" in edit ? offsetRange(document, edit.range) : undefined,
  };
}
