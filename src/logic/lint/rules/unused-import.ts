import { parseLusiaImports } from "../../imports.ts";
import type { LintFinding, LintRule } from "../types.ts";

export const unusedImport: LintRule = ({ script, scriptOffset, markup }) =>
  parseLusiaImports(script)
    .filter((item) => !isUsedAsTag(markup, item.name))
    .map((item): LintFinding => ({
      offset: scriptOffset + item.index,
      code: "unused-import",
      message: `"${item.name}" is imported but never used as a tag`,
      severity: "warning",
    }));

function isUsedAsTag(markup: string, name: string): boolean {
  return new RegExp(`<${name}(?=[\\s/>])`).test(markup);
}
