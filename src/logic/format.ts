import { format, type Options } from "prettier";
import { formatLusia as formatLusiaSource } from "@language/format.ts";
import { prettierParts } from "@language/prettier-parts.ts";

const parts = prettierParts(async () => ({
  format: (code, options) => format(code, options as Options),
})).parts;

/** Formats a .lusia file with the shared section kernel and Prettier. */
export function formatLusia(source: string): Promise<string> {
  return formatLusiaSource(source, parts);
}
