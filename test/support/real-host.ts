import * as api from "lusiajs/api";
import * as compiler from "lusiajs/compiler";
import * as completionData from "lusiajs/editor/completion-data.ts";
import * as completions from "lusiajs/editor/completions.ts";
import * as markupItems from "lusiajs/editor/completion/markup-items.ts";
import * as apiLookup from "lusiajs/editor/api-lookup.ts";
import * as autoImport from "lusiajs/editor/auto-import.ts";
import * as errorPosition from "lusiajs/editor/error-position.ts";
import * as hover from "lusiajs/editor/hover.ts";
import * as markdown from "lusiajs/editor/markdown.ts";
import * as range from "lusiajs/editor/range.ts";
import * as scriptSymbols from "lusiajs/editor/script/symbols.ts";
import * as format from "lusiajs/language/format/format.ts";
import * as formatExpressions from "lusiajs/language/format/format-expressions.ts";
import * as indentSetting from "lusiajs/language/format/indent-setting.ts";
import * as prettierParts from "lusiajs/language/format/prettier-parts.ts";
import * as lint from "lusiajs/language/lint/lint.ts";
import * as parseImports from "lusiajs/language/parse/imports.ts";
import * as parseProps from "lusiajs/language/parse/props.ts";
import * as parseRegions from "lusiajs/language/parse/regions.ts";
import * as parseSections from "lusiajs/language/parse/sections.ts";
import * as parseTag from "lusiajs/language/parse/tag.ts";
import * as runtime from "lusiajs";
import type { LusiaHost } from "../../src/host/types.ts";

/** The real lusiajs modules, wired the way the editor host wires them. */
export const realHost: LusiaHost = {
  range,
  completions,
  completionData,
  markupItems,
  hover,
  markdown,
  apiLookup,
  autoImport,
  errorPosition,
  scriptSymbols,
  format,
  formatExpressions,
  indentSetting,
  prettierParts,
  lint,
  parseImports,
  parseProps,
  parseRegions,
  parseSections,
  parseTag,
  compiler,
  api,
  runtime,
};

/** A host source that always answers with the real modules, for provider tests. */
export const realHosts = async () => realHost;
