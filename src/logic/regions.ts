import { sectionAt, type Section, type SectionKind } from "./sections.ts";

export interface Region {
  kind: SectionKind | "markup";
  section?: Section;
}

/** A position inside a section's content. The tags themselves count as markup. */
export function regionAt(text: string, offset: number): Region {
  const section = sectionAt(text, offset);
  if (!section || offset < section.contentStart || offset > section.contentEnd) return { kind: "markup" };
  return { kind: section.kind, section };
}
