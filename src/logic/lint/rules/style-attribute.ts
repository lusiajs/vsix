import { tagAttributes } from "../attributes.ts";
import type { LintFinding, LintRule } from "../types.ts";

const STYLE_TAG = /<style(?=[\s>])/g;
const KNOWN_ATTRIBUTES = new Set(["scoped", "global", "lang"]);

export const styleAttribute: LintRule = ({ markup }) => {
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(STYLE_TAG)) {
    for (const attribute of tagAttributes(markup, tag.index + "<style".length)) {
      if (!KNOWN_ATTRIBUTES.has(attribute.name)) findings.push(unknownStyleAttribute(attribute.name, attribute.offset));
    }
  }
  return findings;
};

function unknownStyleAttribute(name: string, offset: number): LintFinding {
  return {
    offset,
    code: "style-attribute",
    message: `Unknown <style> attribute "${name}". Use scoped, global or lang`,
    severity: "warning",
  };
}
