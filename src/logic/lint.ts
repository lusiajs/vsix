import { declaredProps } from "../component-file.ts";
import { buildContext } from "./lint/context.ts";
import { animateAttributes } from "./lint/rules/animate-attributes.ts";
import { animateKeys } from "./lint/rules/animate-keys.ts";
import { bindTargets } from "./lint/rules/bind-targets.ts";
import { emptyExpression } from "./lint/rules/empty-expression.ts";
import { flowChain } from "./lint/rules/flow-chain.ts";
import { propsTwice } from "./lint/rules/props-twice.ts";
import { scrollLines } from "./lint/rules/scroll-lines.ts";
import { styleAttribute } from "./lint/rules/style-attribute.ts";
import { unknownProp } from "./lint/rules/unknown-prop.ts";
import { unusedImport } from "./lint/rules/unused-import.ts";
import type { LintFinding, LintIssue, LintRule } from "./lint/types.ts";

export type { LintIssue } from "./lint/types.ts";

const RULES: LintRule[] = [
  unusedImport,
  propsTwice,
  unknownProp,
  emptyExpression,
  styleAttribute,
  animateAttributes,
  animateKeys,
  scrollLines,
  flowChain,
  bindTargets,
];

/** Lint warnings for a .lusia source. `file` is used to find the props of imported components. */
export function lintLusia(source: string, file: string): LintIssue[] {
  const context = buildContext(source, (name) => declaredProps(file, source, name));
  return RULES.flatMap((rule) => rule(context))
    .sort((a, b) => a.offset - b.offset)
    .map((finding) => toIssue(source, finding));
}

function toIssue(source: string, finding: LintFinding): LintIssue {
  const before = source.slice(0, finding.offset);
  const line = before.split("\n").length;
  const column = finding.offset - before.lastIndexOf("\n");
  return { line, column, message: finding.message, severity: finding.severity, code: finding.code };
}
