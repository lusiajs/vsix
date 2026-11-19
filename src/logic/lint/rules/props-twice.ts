import type { LintFinding, LintRule } from "../types.ts";

const PROPS_CALL = /\bprops\s*\(/g;

export const propsTwice: LintRule = ({ script, scriptOffset }) => {
  const calls = [...script.matchAll(PROPS_CALL)];
  return calls.slice(1).map((call): LintFinding => ({
    offset: scriptOffset + call.index,
    code: "props-twice",
    message: "props() can be called only once per component",
    severity: "warning",
  }));
};
