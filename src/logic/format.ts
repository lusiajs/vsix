import type { Options } from "prettier";
import { formatLusia as formatLusiaSource } from "@language/format/format.ts";
import { prettierParts } from "@language/format/prettier-parts.ts";

/** The indentation the editor formats with, used when the Prettier config leaves it out. */
export interface FormatSettings {
  fileName?: string;
  tabSize?: number;
  insertSpaces?: boolean;
  indentScriptAndStyle?: boolean;
}

type Prettier = typeof import("prettier");

let loaded: Promise<Prettier> | undefined;

export async function formatLusia(source: string, settings: FormatSettings = {}): Promise<string> {
  const prettier = await loadPrettier();
  const config = await configFor(prettier, settings);
  const parts = prettierParts(
    async () => ({ format: (code, options) => prettier.format(code, options as Options) }),
    config,
    settings.indentScriptAndStyle ?? true,
  ).parts;
  return formatLusiaSource(source, parts);
}

// Prettier is large, so it loads on the first format, not when the extension starts.
function loadPrettier(): Promise<Prettier> {
  loaded ??= import("prettier");
  return loaded;
}

/** The Prettier config wins; the editor's indent fills in what the config does not set. */
async function configFor(
  prettier: Prettier,
  settings: FormatSettings,
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> =
    settings.fileName === undefined
      ? {}
      : ((await prettier.resolveConfig(settings.fileName)) ?? {});
  const editor: Record<string, unknown> = {};
  if (settings.tabSize !== undefined) editor.tabWidth = settings.tabSize;
  if (settings.insertSpaces !== undefined) editor.useTabs = !settings.insertSpaces;
  return { ...editor, ...resolved };
}
