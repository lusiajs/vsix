import type { ApiEntry, ApiMember } from "../../../../reference/api.ts";
import type { HoverResult } from "./hover.ts";
import type { PropDef } from "./props.ts";

export function hoverMarkdown(result: HoverResult): string {
  if (result.kind === "api") return apiMarkdown(result.entry);
  if (result.kind === "css") return cssMarkdown(result.name);
  return componentMarkdown(result.name, result.props);
}

function cssMarkdown(name: string): string {
  return [
    `**${name}**`,
    "",
    fence("ts", `{ ${name}: string | number }`),
    "CSS style property. Set it in a keyframe, such as `0: { ${name}: ... }`.",
    "",
  ].join("\n");
}

function apiMarkdown(entry: ApiEntry): string {
  return [
    `**${entry.name}**`,
    "",
    fence("ts", entry.signature),
    entry.summary,
    "",
    ...entry.bullets.map((bullet) => `- ${bullet}`),
    "",
    ...membersMarkdown(entry),
    "Example:",
    "",
    fence(exampleLanguage(entry.example), entry.example),
  ].join("\n");
}

function membersMarkdown(entry: ApiEntry): string[] {
  if (!entry.members) return [];
  return ["Members:", "", ...memberLines(entry.name, entry.members), ""];
}

/** One line per member; a nested group (such as EASE.STYLE) lists its own members under it. */
function memberLines(path: string, members: ApiMember[]): string[] {
  return members.flatMap((member) => {
    const memberPath = `${path}.${member.name}`;
    return [
      `- \`${memberPath}\`: ${member.summary}`,
      ...memberLines(memberPath, member.members ?? []),
    ];
  });
}

function componentMarkdown(name: string, props: PropDef[]): string {
  const lines = [`**<${name} />**`, "", "Props:", ""];
  if (props.length === 0)
    return [...lines.slice(0, 2), "This component declares no props."].join("\n");
  return [...lines, ...props.map(propLine)].join("\n");
}

function propLine(prop: PropDef): string {
  return prop.defaultValue === undefined
    ? `- \`${prop.name}\``
    : `- \`${prop.name}\` = \`${prop.defaultValue}\``;
}

function fence(language: string, code: string): string {
  return ["```" + language, code, "```"].join("\n");
}

function exampleLanguage(example: string): string {
  return example.trimStart().startsWith("<") ? "html" : "ts";
}
