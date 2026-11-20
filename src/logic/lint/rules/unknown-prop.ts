import { componentPropName } from "../../../../../../src/compiler/template/bind.ts";
import { parseLuciaImports } from "../../imports.ts";
import { tagAttributes } from "../attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

const COMPONENT_TAG = /<([A-Za-z][\w.-]*)/g;

export function unknownProp({ script, markup, childProps }: LintContext): LintFinding[] {
  const imported = new Set(parseLuciaImports(script).map((item) => item.name));
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(COMPONENT_TAG)) {
    const name = tag[1] ?? "";
    const declared = imported.has(name) ? childProps(name) : undefined;
    if (!declared) continue;
    const names = new Set(declared.map((prop) => prop.name));
    for (const attribute of tagAttributes(markup, tag.index + 1 + name.length)) {
      if (!names.has(componentPropName(attribute.name)))
        findings.push(unknownFinding(name, attribute.name, attribute.offset));
    }
  }
  return findings;
}

function unknownFinding(component: string, prop: string, offset: number): LintFinding {
  return {
    offset,
    code: "unknown-prop",
    message: `${component} does not declare a prop named "${prop}"`,
    severity: "warning",
  };
}
