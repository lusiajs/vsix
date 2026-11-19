import { FORM_TAGS } from "../../../../../../src/compiler/template/bind.ts";
import { parseLuciaImports } from "../../imports.ts";
import { tagAttributes } from "../attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

const TAG = /<([A-Za-z][\w.-]*)/g;
const ON_COMPONENT = "bind works on elements only";
const ON_PLAIN_TAG = "bind works on input, textarea and select; use bind-<property>";

/** Mirrors the compiler: plain `bind` only works on form controls, and not on components. */
export function bindTargets({ script, markup }: LintContext): LintFinding[] {
  const imported = new Set(parseLuciaImports(script).map((item) => item.name));
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(TAG)) {
    const name = tag[1] ?? "";
    if (name === "style") continue;
    const bind = tagAttributes(markup, tag.index + 1 + name.length).find(
      (attribute) => attribute.name === "bind",
    );
    const message = bind && bindMessage(name, imported.has(name));
    if (bind && message)
      findings.push({ offset: bind.offset, code: "bind-target", message, severity: "error" });
  }
  return findings;
}

function bindMessage(name: string, isComponent: boolean): string | undefined {
  if (isComponent) return ON_COMPONENT;
  return FORM_TAGS.has(name) ? undefined : ON_PLAIN_TAG;
}
