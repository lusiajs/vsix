import type { ApiEntry } from "../../../../reference/api.ts";
import type { HoverResult } from "./hover.ts";
import type { PropDef } from "./props.ts";

export function hoverMarkdown(result: HoverResult): string {
  return result.kind === "api" ? apiMarkdown(result.entry) : componentMarkdown(result.name, result.props);
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
  return ["Members:", "", ...entry.members.map((member) => `- \`${entry.name}.${member.name}\`: ${member.summary}`), ""];
}

function componentMarkdown(name: string, props: PropDef[]): string {
  const lines = [`**<${name} />**`, "", "Props:", ""];
  if (props.length === 0) return [...lines.slice(0, 2), "This component declares no props."].join("\n");
  return [...lines, ...props.map(propLine)].join("\n");
}

function propLine(prop: PropDef): string {
  return prop.defaultValue === undefined ? `- \`${prop.name}\`` : `- \`${prop.name}\` = \`${prop.defaultValue}\``;
}

function fence(language: string, code: string): string {
  return ["```" + language, code, "```"].join("\n");
}

function exampleLanguage(example: string): string {
  return example.trimStart().startsWith("<") ? "html" : "ts";
}
