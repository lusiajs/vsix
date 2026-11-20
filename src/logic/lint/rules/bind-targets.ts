import { FORM_TAGS } from "../../../../../../src/compiler/template/bind.ts";
import { parseLusiaImports } from "../../imports.ts";
import { tagAttributes } from "../attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

const TAG = /<([A-Za-z][\w.-]*)/g;
const ON_COMPONENT = "bind-element works on elements only";
const ON_PLAIN_TAG = "bind-value works on input, textarea and select; use bind-<property>";

/** Mirrors the compiler: `bind-value` only works on form controls, and `bind-element` not on components. */
export function bindTargets({ script, markup }: LintContext): LintFinding[] {
  const imported = new Set(parseLusiaImports(script).map((item) => item.name));
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(TAG)) {
    const name = tag[1] ?? "";
    if (name === "style") continue;
    const isComponent = imported.has(name);
    for (const attribute of tagAttributes(markup, tag.index + 1 + name.length)) {
      const message = bindMessage(attribute.name, name, isComponent);
      if (message)
        findings.push({ offset: attribute.offset, code: "bind-target", message, severity: "error" });
    }
  }
  return findings;
}

function bindMessage(attr: string, tag: string, isComponent: boolean): string | undefined {
  if (isComponent) return attr === "bind-element" ? ON_COMPONENT : undefined;
  if (attr !== "bind-value") return undefined;
  return FORM_TAGS.has(tag) ? undefined : ON_PLAIN_TAG;
}
