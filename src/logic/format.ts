import { formatLusia as formatLusiaSource } from "@language/format.ts";
import { formatMarkup, formatScript, formatStyle } from "./format-parts.ts";

/** Formats a .lusia file with the shared section kernel and Prettier. */
export function formatLusia(source: string): Promise<string> {
  return formatLusiaSource(source, { script: formatScript, style: formatStyle, markup: formatMarkup });
}
