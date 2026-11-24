import type * as TypeScript from "typescript";
import type { TypeScriptModule } from "./load.ts";
import { inSpans } from "./map.ts";
import type { TextRange } from "lusiajs/editor/range.ts";
import type { TsIssue } from "./types.ts";

const IGNORED_CODES: ReadonlySet<number> = new Set([
  2688, 2318, 18003, 2686, 2687,
]);

/** Only diagnostics inside copied code count; unresolved .lusia imports stay quiet. */
export function toIssues(
  ts: TypeScriptModule,
  diagnostics: readonly TypeScript.Diagnostic[],
  spans: readonly TextRange[],
  sourceLength: number,
): TsIssue[] {
  const issues: TsIssue[] = [];
  for (const diagnostic of diagnostics) {
    const start = diagnostic.start;
    if (start === undefined || start < 0 || start >= sourceLength) continue;
    if (
      diagnostic.file === undefined ||
      diagnostic.category === ts.DiagnosticCategory.Suggestion
    )
      continue;
    if (IGNORED_CODES.has(diagnostic.code) || ignoredModule(ts, diagnostic))
      continue;
    if (!inSpans(start, spans)) continue;
    const end = Math.min(start + (diagnostic.length ?? 1), sourceLength);
    issues.push({
      start,
      end,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      code: diagnostic.code,
      severity:
        diagnostic.category === ts.DiagnosticCategory.Warning
          ? "warning"
          : "error",
    });
  }
  return issues.sort((left, right) => left.start - right.start);
}

function ignoredModule(
  ts: TypeScriptModule,
  diagnostic: TypeScript.Diagnostic,
): boolean {
  if (diagnostic.code !== 2307) return false;
  return ts
    .flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    .includes(".lusia");
}
