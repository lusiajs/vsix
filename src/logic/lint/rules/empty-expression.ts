import { expressionEnd } from "../../format-expressions.ts";
import type { LintFinding, LintRule } from "../types.ts";

export const emptyExpression: LintRule = ({ markup }) => {
  const findings: LintFinding[] = [];
  for (let i = markup.indexOf("{"); i !== -1; i = markup.indexOf("{", i + 1)) {
    const end = expressionEnd(markup, i);
    if (end !== -1 && markup.slice(i + 1, end).trim() === "") findings.push(emptyFinding(i));
  }
  return findings;
};

function emptyFinding(offset: number): LintFinding {
  return { offset, code: "empty-expression", message: "Empty expression: {} renders nothing", severity: "warning" };
}
