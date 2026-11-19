import { planLuciaImport, type TextEdit } from "./auto-import.ts";
import { scriptItems, tagNameItems, propItems, STYLE_ATTRIBUTE_ITEMS, STYLE_BODY_ITEMS, type CompletionItemData, type ScriptItem } from "./completion-data.ts";
import { animateFieldsAt } from "./animate-fields.ts";
import { FLOW_TAG_ITEMS, flowAttributeItems, isFlowTag, markupAttributeItems } from "./markup-items.ts";
import { enumMembersAt } from "./enum-members.ts";
import { findComponentImport, scriptImports } from "./imports.ts";
import type { PropDef } from "./props.ts";
import { regionAt } from "./regions.ts";
import { scriptSection, type Section } from "./sections.ts";
import { isTagNameTyping, openTagAt } from "./tag.ts";

export interface CompletionResult extends CompletionItemData {
  /** Document offsets. */
  importEdit?: TextEdit;
}

export type PropLookup = (componentName: string) => PropDef[];

export function completionsAt(text: string, offset: number, propsOf: PropLookup): CompletionResult[] {
  const members = enumMembersAt(text, offset);
  if (members) return members.map((item) => withScriptImport(item, text));
  const region = regionAt(text, offset);
  if (region.section?.kind === "script") return scriptCompletions(text, region.section);
  if (region.section?.kind === "style") return STYLE_BODY_ITEMS;
  return markupCompletions(text, offset, propsOf);
}

function scriptCompletions(text: string, section: Section): CompletionResult[] {
  return scriptItems().map((item) => withImport(item, text, section));
}

/** Adds the import edit when the item needs one and the file has a script section. */
function withScriptImport(item: ScriptItem, text: string): CompletionResult {
  const section = scriptSection(text);
  if (!section) return item;
  return withImport(item, text, section);
}

function withImport(item: ScriptItem, text: string, section: Section): CompletionResult {
  const { importName, ...data } = item;
  const script = text.slice(section.contentStart, section.contentEnd);
  const edit = importName ? planLuciaImport(script, importName) : undefined;
  if (!edit) return data;
  return { ...data, importEdit: { ...edit, start: edit.start + section.contentStart, end: edit.end + section.contentStart } };
}

function markupCompletions(text: string, offset: number, propsOf: PropLookup): CompletionItemData[] {
  if (isTagNameTyping(text, offset)) return [...tagNameItems(scriptImports(text)), ...FLOW_TAG_ITEMS];
  const fields = animateFieldsAt(text, offset);
  if (fields) return fields.map((item) => withScriptImport(item, text));
  const tag = openTagAt(text, offset);
  if (!tag) return [];
  if (tag.name === "style") return STYLE_ATTRIBUTE_ITEMS;
  if (isFlowTag(tag.name)) return flowAttributeItems(tag.name);
  if (!findComponentImport(text, tag.name)) return markupAttributeItems(tag.name);
  return propItems(propsOf(tag.name));
}
