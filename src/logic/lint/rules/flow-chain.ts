import type { LintFinding, LintRule } from "../types.ts";

const CHAIN_TAG = /<(ELSEIF|ELSE)(?=[\s/>])/g;
const AFTER_BRANCH = /<\/(IF|ELSEIF)\s*>\s*$/;

/** Mirrors the compiler: ELSEIF and ELSE must come right after </IF> or </ELSEIF>. */
export const flowChain: LintRule = ({ markup }) => {
  const findings: LintFinding[] = [];
  for (const tag of markup.matchAll(CHAIN_TAG)) {
    if (AFTER_BRANCH.test(markup.slice(0, tag.index))) continue;
    findings.push({
      offset: tag.index,
      code: "flow-chain",
      message: `<${tag[1]}> must come right after </IF> or </ELSEIF>`,
      severity: "error",
    });
  }
  return findings;
};
