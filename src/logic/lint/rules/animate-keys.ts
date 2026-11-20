import { CODES } from "../../../../../../src/compiler/errors/codes.ts";
import { fill } from "../../../../../../src/compiler/errors/create.ts";
import {
  unknownKeysAt,
  type UnknownKey,
} from "../../../../../../src/compiler/template/animate-keys.ts";
import type { LintContext, LintFinding } from "../types.ts";

const ANIMATE_EXPRESSION = /\banimate=\{/g;

/** Marks keys the runtime would reject in an animate value, such as a typo of `default`. */
export function animateKeys({ source, markup, script, scriptOffset }: LintContext): LintFinding[] {
  const range = { from: scriptOffset, to: scriptOffset + script.length };
  const findings: LintFinding[] = [];
  for (const match of markup.matchAll(ANIMATE_EXPRESSION)) {
    const start = match.index + "animate={".length;
    for (const unknown of unknownKeysAt(source, start, range)) findings.push(toFinding(unknown));
  }
  return findings;
}

function toFinding({ offset, code, values }: UnknownKey): LintFinding {
  const entry = CODES[code];
  return {
    offset,
    code: "animate-key",
    message: `${fill(entry.message, values)} (${fill(entry.hint, values)})`,
    severity: "error",
  };
}
