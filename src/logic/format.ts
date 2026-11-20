import { formatMarkup, formatScript, formatStyle } from "./format-parts.ts";
import { findSections, type Section } from "./sections.ts";

/** Formats a .lusia file: script as TypeScript, styles as SCSS or CSS, markup as HTML. Sections keep their order. */
export async function formatLusia(source: string): Promise<string> {
  const blocks: string[] = [];
  let last = 0;
  for (const section of findSections(source)) {
    blocks.push(await formatMarkupBlock(source.slice(last, section.openStart)));
    blocks.push(await formatSectionBlock(source, section));
    last = section.end;
  }
  blocks.push(await formatMarkupBlock(source.slice(last)));
  return blocks.filter((block) => block !== "").join("\n\n") + "\n";
}

async function formatMarkupBlock(markup: string): Promise<string> {
  return markup.trim() === "" ? "" : formatMarkup(markup);
}

async function formatSectionBlock(source: string, section: Section): Promise<string> {
  const content = source.slice(section.contentStart, section.contentEnd);
  const code = await formatSectionContent(section, content);
  const open = `<${section.kind}${section.attrs.trimEnd()}>`;
  const close = `</${section.kind}>`;
  return code === "" ? `${open}${close}` : `${open}\n${code}\n${close}`;
}

function formatSectionContent(section: Section, content: string): Promise<string> {
  if (section.kind === "script") return formatScript(content);
  return formatStyle(content, /\blang\s*=\s*"css"/.test(section.attrs));
}
