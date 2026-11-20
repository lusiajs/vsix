import type { Options } from "prettier";
import { formatLusia as formatLusiaSource } from "@language/format.ts";
import { prettierParts } from "@language/prettier-parts.ts";

// Prettier is large, so it loads on the first format, not when the extension starts.
const parts = prettierParts(async () => {
  const { format } = await import("prettier");
  return { format: (code, options) => format(code, options as Options) };
}).parts;

/** Formats a .lusia file with the shared section kernel and Prettier. */
export function formatLusia(source: string): Promise<string> {
  return formatLusiaSource(source, parts);
}
