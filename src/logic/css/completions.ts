import { basename } from "node:path";
import type { CompletionItem } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import type { CompletionResult } from "lusia/editor/completions.ts";
import type { TextRange } from "lusia/editor/range.ts";
import { hoverText, offsetRange, toCompletionKind } from "../language-service.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import { indexMembers } from "./scss/find.ts";
import { buildScssIndex } from "./scss/index.ts";
import type { ScssIndex, ScssMember } from "./scss/types.ts";

export function cssCompletions(
  text: string,
  offset: number,
  fileName?: string,
): CompletionResult[] {
  try {
    const style = styleContextAt(text, offset);
    if (!style) return [];
    const official = officialCompletions(style);
    const indexed = scssCompletions(style, fileName, offset);
    return dedupe([...official, ...indexed]);
  } catch {
    return [];
  }
}

function officialCompletions(style: StyleContext): CompletionResult[] {
  const stylesheet = style.service.parseStylesheet(style.document);
  const list = style.service.doComplete(style.document, style.position, stylesheet);
  return list.items.map((item) => completionItem(item, style));
}

function completionItem(item: CompletionItem, style: StyleContext): CompletionResult {
  return {
    label: item.label,
    kind: toCompletionKind(item.kind),
    insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
    snippet: item.insertTextFormat === 2,
    detail: item.detail,
    documentation: hoverText({ contents: item.documentation }),
    range: completionRange(item.textEdit, style),
  };
}

function completionRange(
  edit: CompletionItem["textEdit"],
  style: StyleContext,
): TextRange | undefined {
  if (!edit || !("range" in edit)) return undefined;
  const range = offsetRange(style.document, edit.range);
  return range && shift(range, style.section.contentStart);
}

function scssCompletions(
  style: StyleContext,
  fileName: string | undefined,
  offset: number,
): CompletionResult[] {
  if (style.language !== "scss") return [];
  const index = buildScssIndex(fileName, style.content);
  if (index.members.length === 0) return [];
  const end = offset - style.section.contentStart;
  const before = style.content.slice(0, end);
  const namespaced = /([A-Za-z_][\w-]*)\.(\$?[\w-]*)$/.exec(before);
  if (namespaced) {
    const prefix = namespaced[2] ?? "";
    return namespacedItems(index, namespaced[1] ?? "", prefix, rangeOf(style, end, prefix));
  }
  const variable = /(^|[^\w-])(\$[\w-]*)$/.exec(before);
  if (variable) {
    const prefix = variable[2] ?? "";
    return memberItems(
      indexMembers(index, undefined).filter(
        (member) => member.kind === "variable" && member.name.startsWith(prefix),
      ),
      (member) => member.name,
      rangeOf(style, end, prefix),
    );
  }
  const include = /@include\s+([\w-]*)$/.exec(before);
  if (include) {
    const prefix = include[1] ?? "";
    return memberItems(
      mixinItems(index, prefix),
      (member) => (member.namespace ? `${member.namespace}.${member.name}` : member.name),
      rangeOf(style, end, prefix),
    );
  }
  return [];
}

function namespacedItems(
  index: ScssIndex,
  namespace: string,
  prefix: string,
  range: TextRange,
): CompletionResult[] {
  const variables = prefix.startsWith("$");
  return memberItems(
    indexMembers(index, namespace).filter(
      (member) =>
        (variables ? member.kind === "variable" : member.kind !== "variable") &&
        member.name.startsWith(prefix),
    ),
    (member) => member.name,
    range,
  );
}

function mixinItems(index: ScssIndex, prefix: string): ScssMember[] {
  return index.members.filter((member) => {
    if (member.kind !== "mixin") return false;
    if (!member.namespace) return member.name.startsWith(prefix);
    const qualified = `${member.namespace}.${member.name}`;
    return prefix === "" || qualified.startsWith(prefix);
  });
}

function memberItems(
  members: ScssMember[],
  insert: (member: ScssMember) => string,
  range: TextRange,
): CompletionResult[] {
  return members.map((member) => ({
    label: insert(member),
    kind: member.kind === "variable" ? "variable" : "function",
    insertText: insert(member),
    snippet: false,
    detail: member.detail,
    documentation: `${member.detail}\n\nFrom \`${basename(member.path)}\``,
    range,
  }));
}

function rangeOf(style: StyleContext, end: number, prefix: string): TextRange {
  return shift({ start: end - prefix.length, end }, style.section.contentStart);
}

function dedupe(items: CompletionResult[]): CompletionResult[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}
