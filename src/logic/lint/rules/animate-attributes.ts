import { parseLusiaImports } from "../../imports.ts";
import { tagAttributes, type AttributeName } from "../attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

const TAG = /<([A-Za-z][\w.-]*)/g;

/** Mirrors the compiler's check on the `animate` attribute: it must be `{expr}`. */
export function animateAttributes({ script, markup }: LintContext): LintFinding[] {
  const imported = new Set(parseLusiaImports(script).map((item) => item.name));
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(TAG)) {
    const name = tag[1] ?? "";
    if (imported.has(name) || name === "style") continue;
    findings.push(...tagFindings(tagAttributes(markup, tag.index + 1 + name.length)));
  }
  return findings;
}

function tagFindings(attributes: AttributeName[]): LintFinding[] {
  const animate = attributes.find((attribute) => attribute.name === "animate");
  if (!animate || animate.value === "expression") return [];
  return [
    {
      offset: animate.offset,
      code: "animate-keyframes",
      message: "animate needs {keyframes}",
      severity: "error",
    },
  ];
}
