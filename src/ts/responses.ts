import type * as TypeScript from "typescript";
import type { CompletionKind } from "lusiajs/editor/completion-data.ts";
import type { TypeScriptModule } from "./load.ts";
import { spanRange } from "./map.ts";
import type {
  TsCompletion,
  TsCompletionDetails,
  TsHover,
  TsImportEdit,
  TsSignature,
} from "./types.ts";

const KINDS: Readonly<Record<string, CompletionKind>> = {
  function: "function",
  memberFunction: "function",
  memberGetAccessor: "function",
  memberSetAccessor: "function",
  class: "class",
  interface: "type",
  type: "type",
  typeParameter: "type",
  enum: "type",
  module: "type",
  primitiveType: "type",
  keyword: "keyword",
  property: "property",
  memberVariable: "property",
  enumMember: "property",
  alias: "property",
  const: "variable",
  let: "variable",
  var: "variable",
  localVar: "variable",
  parameter: "variable",
};

export function toCompletions(
  info: TypeScript.CompletionInfo | undefined,
): TsCompletion[] {
  if (info === undefined) return [];
  const items: TsCompletion[] = [];
  for (const entry of info.entries) {
    if (isHelper(entry.name)) continue;
    items.push({
      name: entry.name,
      insertText: entry.insertText ?? entry.name,
      kind: completionKind(entry.kind),
      sortText: entry.sortText,
      source: entry.source,
      range:
        entry.replacementSpan === undefined
          ? undefined
          : spanRange(entry.replacementSpan),
      hasAction: entry.hasAction === true,
      entryData: entry.data,
    });
  }
  return items;
}

export function toCompletionDetails(
  ts: TypeScriptModule,
  details: TypeScript.CompletionEntryDetails | undefined,
  virtualPath: string,
  entryData: unknown,
): TsCompletionDetails | undefined {
  if (details === undefined) return undefined;
  const codeActions = details.codeActions?.length ?? 0;
  return {
    name: details.name,
    insertText: details.name,
    kind: completionKind(details.kind),
    sortText: "",
    hasAction: codeActions > 0,
    codeActions,
    entryData,
    importEdits: importEditsOf(details, virtualPath),
    detail: text(ts, details.displayParts),
    documentation: text(ts, details.documentation),
  };
}

/** The code action edits that belong to the open component, such as the added import. */
function importEditsOf(
  details: TypeScript.CompletionEntryDetails,
  virtualPath: string,
): TsImportEdit[] {
  const edits: TsImportEdit[] = [];
  for (const action of details.codeActions ?? []) {
    for (const change of action.changes) {
      if (change.fileName !== virtualPath) continue;
      for (const textChange of change.textChanges) {
        edits.push({
          start: textChange.span.start,
          end: textChange.span.start + textChange.span.length,
          text: textChange.newText,
        });
      }
    }
  }
  return edits;
}

export function toHover(
  ts: TypeScriptModule,
  quickInfo: TypeScript.QuickInfo | undefined,
): TsHover | undefined {
  if (quickInfo === undefined) return undefined;
  const code = text(ts, quickInfo.displayParts);
  if (code === "") return undefined;
  const documentation = text(ts, quickInfo.documentation);
  const markdown =
    documentation === "" ? fence(code) : `${fence(code)}\n\n${documentation}`;
  return { markdown, range: spanRange(quickInfo.textSpan) };
}

export function toSignature(
  ts: TypeScriptModule,
  help: TypeScript.SignatureHelpItems | undefined,
): TsSignature | undefined {
  if (help === undefined || help.items.length === 0) return undefined;
  const item = help.items[help.selectedItemIndex] ?? help.items[0]!;
  const separator = text(ts, item.separatorDisplayParts);
  const parameters = item.parameters.map((parameter) => ({
    label: text(ts, parameter.displayParts),
    documentation: text(ts, parameter.documentation),
  }));
  return {
    label:
      text(ts, item.prefixDisplayParts) +
      parameters.map((parameter) => parameter.label).join(separator) +
      text(ts, item.suffixDisplayParts),
    documentation: text(ts, item.documentation),
    parameters,
    activeParameter: help.argumentIndex,
  };
}

function completionKind(kind: string): CompletionKind {
  return KINDS[kind] ?? "property";
}

function isHelper(name: string): boolean {
  return name.startsWith("__lusia") || name.startsWith("__Lusia");
}

function text(
  ts: TypeScriptModule,
  parts: TypeScript.SymbolDisplayPart[] | undefined,
): string {
  return parts === undefined ? "" : ts.displayPartsToString(parts).trim();
}

function fence(code: string): string {
  return `\`\`\`ts\n${code}\n\`\`\``;
}
