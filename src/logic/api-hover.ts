import type { ApiEntry, ApiMember } from "lusiajs/api";

/** The hover for a Lusia API name: declaration, summary, example, then the members table. */
export function apiHoverMarkdown(entry: ApiEntry): string {
  return [
    fence(declarationLanguage(entry), declarationOf(entry)),
    "",
    entry.summary,
    "",
    "Example",
    "",
    fence(exampleLanguage(entry.example), entry.example),
    "",
    ...membersSection(entry),
  ].join("\n");
}

/** A value with members shows its top-level names only, such as `const EASE: { STYLE, IN, OUT, INOUT }`. */
export function declarationOf(entry: ApiEntry): string {
  if (entry.kind !== "value" || entry.members === undefined) return entry.signature;
  const names = entry.members.map((member) => member.name).join(", ");
  return `const ${entry.name}: { ${names} }`;
}

function membersSection(entry: ApiEntry): string[] {
  if (entry.members === undefined) return [];
  return ["Members", "", "| Value | What it does |", "| --- | --- |", ...memberRows(entry.members)];
}

function memberRows(members: ApiMember[], parent?: string): string[] {
  return members.flatMap((member) => {
    const value = parent === undefined ? member.name : `${parent}.${member.name}`;
    return [
      `| \`${value}\` | ${tableCell(member.summary)} |`,
      ...memberRows(member.members ?? [], value),
    ];
  });
}

function declarationLanguage(entry: ApiEntry): string {
  return entry.kind === "markup" ? "html" : "ts";
}

function exampleLanguage(example: string): string {
  return example.trimStart().startsWith("<") ? "html" : "ts";
}

function tableCell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function fence(language: string, code: string): string {
  return ["```" + language, code, "```"].join("\n");
}
