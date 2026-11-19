export type SectionKind = "script" | "style";

export interface Section {
  kind: SectionKind;
  attrs: string;
  openStart: number;
  contentStart: number;
  contentEnd: number;
  end: number;
}

const OPEN_TAG = /<(script|style)(\s[^>]*)?>/;

export function findSections(text: string): Section[] {
  const open = new RegExp(OPEN_TAG.source, "g");
  const sections: Section[] = [];
  let match = open.exec(text);
  while (match) {
    const section = readSection(text, match);
    if (section) {
      sections.push(section);
      open.lastIndex = section.end;
    }
    match = open.exec(text);
  }
  return sections;
}

function readSection(text: string, match: RegExpExecArray): Section | undefined {
  const kind = match[1] as SectionKind;
  const contentStart = match.index + match[0].length;
  const closeTag = `</${kind}>`;
  const contentEnd = text.indexOf(closeTag, contentStart);
  if (contentEnd === -1) return undefined;
  return {
    kind,
    attrs: match[2] ?? "",
    openStart: match.index,
    contentStart,
    contentEnd,
    end: contentEnd + closeTag.length,
  };
}

export function sectionAt(text: string, offset: number): Section | undefined {
  return findSections(text).find((section) => offset >= section.openStart && offset <= section.end);
}

export function scriptSection(text: string): Section | undefined {
  return findSections(text).find((section) => section.kind === "script");
}
