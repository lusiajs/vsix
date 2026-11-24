import type { Diagnostic } from "vscode-css-languageservice/lib/esm/cssLanguageService.js";
import { offsetRange } from "../language-service.ts";
import { shift, styleSections, type StyleSection } from "./context.ts";
import type { LusiaHost } from "../../host/types.ts";
import type { CssDiagnostic, CssDiagnosticSeverity } from "./types.ts";

const IGNORED_AT_RULE = /^Unknown at rule @(scoped|global)\b/;

const SEVERITIES: Record<number, CssDiagnosticSeverity> = {
  1: "error",
  2: "warning",
  3: "information",
  4: "hint",
};

/** Style diagnostics, with the ranges already shifted into the component. */
export function cssDiagnostics(host: LusiaHost, text: string): CssDiagnostic[] {
  const diagnostics: CssDiagnostic[] = [];
  for (const style of styleSections(host, text)) {
    for (const diagnostic of validation(style)) {
      if (IGNORED_AT_RULE.test(diagnostic.message)) continue;
      const padded = offsetRange(style.document, diagnostic.range);
      if (!padded) continue;
      diagnostics.push({
        message: diagnostic.message,
        severity: SEVERITIES[diagnostic.severity ?? 1] ?? "error",
        code:
          diagnostic.code === undefined ? undefined : String(diagnostic.code),
        range: shift(padded, style.section.contentStart),
      });
    }
  }
  return diagnostics;
}

function validation(style: StyleSection): Diagnostic[] {
  try {
    const stylesheet = style.service.parseStylesheet(style.document);
    return style.service.doValidation(style.document, stylesheet);
  } catch {
    return [];
  }
}
