import type * as TypeScript from "typescript";
import { toIssues } from "./issues.ts";
import type { TypeScriptModule } from "./load.ts";
import { hasLocation, locationOf } from "./map.ts";
import { toCompletionDetails, toCompletions, toHover, toSignature } from "./responses.ts";
import type { TextRange } from "../../../../src/editor/range.ts";
import type {
  TsCompletion,
  TsCompletionDetails,
  TsEdit,
  TsHover,
  TsIssue,
  TsLocation,
  TsSignature,
} from "./types.ts";

export interface QueryContext {
  typescript: TypeScriptModule;
  service: TypeScript.LanguageService;
  virtualPath: string;
  spans: readonly TextRange[];
  sourceLength: number;
}

export function completionsOf(context: QueryContext, offset: number): TsCompletion[] {
  return safe(
    () =>
      toCompletions(
        context.service.getCompletionsAtPosition(context.virtualPath, offset, {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true,
        }),
      ),
    [],
  );
}

export function completionDetailsOf(
  context: QueryContext,
  offset: number,
  name: string,
  source?: string,
  entryData?: unknown,
): TsCompletionDetails | undefined {
  return safe(
    () =>
      toCompletionDetails(
        context.typescript,
        context.service.getCompletionEntryDetails(
          context.virtualPath,
          offset,
          name,
          {},
          source,
          { includeCompletionsForModuleExports: true },
          entryData as TypeScript.CompletionEntryData | undefined,
        ),
        context.virtualPath,
        entryData,
      ),
    undefined,
  );
}

export function hoverOf(context: QueryContext, offset: number): TsHover | undefined {
  return safe(
    () =>
      toHover(
        context.typescript,
        context.service.getQuickInfoAtPosition(context.virtualPath, offset),
      ),
    undefined,
  );
}

export function issuesOf(context: QueryContext): TsIssue[] {
  return safe(() => {
    const diagnostics = [
      ...context.service.getSyntacticDiagnostics(context.virtualPath),
      ...context.service.getSemanticDiagnostics(context.virtualPath),
    ];
    return toIssues(context.typescript, diagnostics, context.spans, context.sourceLength);
  }, []);
}

export function definitionsOf(context: QueryContext, offset: number): TsLocation[] {
  return safe(() => {
    const infos = context.service.getDefinitionAtPosition(context.virtualPath, offset) ?? [];
    const found: TsLocation[] = [];
    for (const info of infos) {
      const location = locationOf(info.fileName, info.textSpan.start, true);
      if (location !== undefined) found.push(location);
    }
    return found;
  }, []);
}

export function referencesOf(context: QueryContext, offset: number): TsLocation[] {
  return safe(() => {
    const found: TsLocation[] = [];
    for (const symbol of context.service.findReferences(context.virtualPath, offset) ?? []) {
      for (const reference of symbol.references) {
        const location = locationOf(reference.fileName, reference.textSpan.start, false);
        if (location !== undefined && !hasLocation(found, location)) found.push(location);
      }
    }
    return found;
  }, []);
}

export function renameOf(context: QueryContext, offset: number, newName: string): TsEdit[] {
  return safe(() => {
    if (!context.service.getRenameInfo(context.virtualPath, offset).canRename) return [];
    const locations =
      context.service.findRenameLocations(context.virtualPath, offset, false, false) ?? [];
    return locations.flatMap((location) => {
      const found = locationOf(location.fileName, location.textSpan.start, false);
      if (found === undefined) return [];
      return [
        {
          fileName: found.fileName,
          start: found.start,
          end: found.start + location.textSpan.length,
          text: `${location.prefixText ?? ""}${newName}${location.suffixText ?? ""}`,
        },
      ];
    });
  }, []);
}

export function signatureOf(context: QueryContext, offset: number): TsSignature | undefined {
  return safe(
    () =>
      toSignature(
        context.typescript,
        context.service.getSignatureHelpItems(context.virtualPath, offset, {}),
      ),
    undefined,
  );
}

function safe<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}
