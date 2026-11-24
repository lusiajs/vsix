import type { TextRange } from "lusiajs/editor/range.ts";
import type { LusiaHost } from "../../host/types.ts";
import { offsetRange } from "../language-service.ts";
import { shift, styleContextAt, type StyleContext } from "./context.ts";
import { scssMemberAt, scssOccurrences, scssTokenAt } from "./scss/find.ts";
import { buildScssIndex } from "./scss/index.ts";
import { readScssFile } from "./scss/parse.ts";
import type { ScssMember } from "./scss/types.ts";
import type { CssFileEdit, CssTextEdit } from "./types.ts";

export function cssRenameRange(
  host: LusiaHost,
  text: string,
  offset: number,
  fileName?: string,
): TextRange | undefined {
  try {
    const style = styleContextAt(host, text, offset);
    if (!style) return undefined;
    const official = officialRange(style);
    if (official) return official;
    return memberAt(style, fileName, offset)?.range;
  } catch {
    return undefined;
  }
}

export function cssRename(
  host: LusiaHost,
  text: string,
  offset: number,
  newName: string,
  fileName?: string,
): CssFileEdit[] | undefined {
  try {
    const style = styleContextAt(host, text, offset);
    if (!style || newName === "") return undefined;
    const index =
      style.language === "scss"
        ? buildScssIndex(fileName, style.content)
        : undefined;
    const hit = index
      ? scssMemberAt(index, style.content, style.section.contentStart, offset)
      : undefined;
    const token = scssTokenAt(
      style.content,
      style.section.contentStart,
      offset,
    );
    const name = hit
      ? renameTo(hit.member, newName)
      : variableName(token?.text, newName);
    const edits = officialEdits(style, name);
    if (hit) {
      addComponentOccurrences(edits, hit.member, style, name);
      addFileOccurrences(edits, hit.member, index?.files ?? [], name);
    }
    const files = toFileEdits(edits);
    return files.length > 0 ? files : undefined;
  } catch {
    return undefined;
  }
}

interface Edits {
  component: CssTextEdit[];
  files: Map<string, CssTextEdit[]>;
}

function officialRange(style: StyleContext): TextRange | undefined {
  const stylesheet = style.service.parseStylesheet(style.document);
  const range = style.service.prepareRename(
    style.document,
    style.position,
    stylesheet,
  );
  const offsets = offsetRange(style.document, range);
  return offsets && shift(offsets, style.section.contentStart);
}

function officialEdits(style: StyleContext, name: string): Edits {
  const edits: Edits = { component: [], files: new Map() };
  const stylesheet = style.service.parseStylesheet(style.document);
  const workspace = style.service.doRename(
    style.document,
    style.position,
    name,
    stylesheet,
  );
  const changes = workspace.changes ?? {};
  const documentEdits = changes[style.document.uri] ?? [];
  for (const edit of documentEdits) {
    const range = offsetRange(style.document, edit.range);
    addEdit(
      edits.component,
      range && shift(range, style.section.contentStart),
      edit.newText,
    );
  }
  return edits;
}

function addComponentOccurrences(
  edits: Edits,
  member: ScssMember,
  style: StyleContext,
  name: string,
): void {
  for (const range of scssOccurrences(
    member,
    style.content,
    style.section.contentStart,
  )) {
    addEdit(edits.component, range, name);
  }
}

function addFileOccurrences(
  edits: Edits,
  member: ScssMember,
  files: string[],
  name: string,
): void {
  for (const path of files) {
    const file = readScssFile(path);
    if (!file) continue;
    const ranges = scssOccurrences(member, file.text, 0);
    if (ranges.length === 0) continue;
    const fileEdits = edits.files.get(path) ?? [];
    for (const range of ranges) addEdit(fileEdits, range, name);
    edits.files.set(path, fileEdits);
  }
}

function addEdit(
  edits: CssTextEdit[],
  range: TextRange | undefined,
  newText: string,
): void {
  if (!range) return;
  if (edits.some((edit) => edit.range.start === range.start)) return;
  edits.push({ range, newText });
}

function toFileEdits(edits: Edits): CssFileEdit[] {
  const files: CssFileEdit[] = [];
  if (edits.component.length > 0) files.push({ edits: edits.component });
  for (const [path, fileEdits] of edits.files)
    files.push({ path, edits: fileEdits });
  return files;
}

function renameTo(member: ScssMember, newName: string): string {
  return member.kind === "variable"
    ? variableName(member.name, newName)
    : newName;
}

function variableName(token: string | undefined, newName: string): string {
  if (!token?.startsWith("$") || newName.startsWith("$")) return newName;
  return `$${newName}`;
}

function memberAt(
  style: StyleContext,
  fileName: string | undefined,
  offset: number,
) {
  if (style.language !== "scss") return undefined;
  const index = buildScssIndex(fileName, style.content);
  if (index.members.length === 0) return undefined;
  return scssMemberAt(index, style.content, style.section.contentStart, offset);
}
