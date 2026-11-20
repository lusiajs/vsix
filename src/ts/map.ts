import { componentLength } from "./modules.ts";
import type { TextRange } from "../../../shared/range.ts";
import type { TsLocation } from "./types.ts";

const TS_SUFFIX = ".lusia.ts";
const DECLARATION_SUFFIX = ".lusia.d.ts";
const COMPONENT_SUFFIX = ".lusia";

export interface RealFile {
  fileName: string;
  /** A generated declaration module, so its offsets are not the component's own. */
  generated: boolean;
}

/** The real file behind a virtual one, or undefined when the file is not a component. */
export function realFileOf(fileName: string): RealFile | undefined {
  if (fileName.endsWith(DECLARATION_SUFFIX))
    return {
      fileName: fileName.slice(0, -DECLARATION_SUFFIX.length) + COMPONENT_SUFFIX,
      generated: true,
    };
  if (fileName.endsWith(TS_SUFFIX)) return { fileName: fileName.slice(0, -3), generated: false };
  return undefined;
}

/** The real component path under a virtual `.lusia.ts` or `.lusia.d.ts` name. */
export function realPathOf(fileName: string): string {
  return realFileOf(fileName)?.fileName ?? fileName;
}

export function spanRange(span: { start: number; length: number }): TextRange {
  return { start: span.start, end: span.start + span.length };
}

/** Whether an offset falls inside one of the mapped spans. */
export function inSpans(offset: number, spans: readonly TextRange[]): boolean {
  return spans.some((span) => offset >= span.start && offset < span.end);
}

/** A language service location, moved onto the real file the editor can open. */
export function locationOf(
  fileName: string,
  start: number,
  allowGenerated: boolean,
): TsLocation | undefined {
  const real = realFileOf(fileName);
  if (real === undefined) return { fileName, start };
  if (real.generated) return allowGenerated ? { fileName: real.fileName, start: 0 } : undefined;
  const length = componentLength(real.fileName);
  if (length !== undefined && start > length) return undefined;
  return { fileName: real.fileName, start };
}

export function hasLocation(locations: TsLocation[], candidate: TsLocation): boolean {
  return locations.some(
    (location) => location.fileName === candidate.fileName && location.start === candidate.start,
  );
}
