import type * as api from "lusiajs/api";
import type * as compiler from "lusiajs/compiler";
import type * as completionData from "lusiajs/editor/completion-data.ts";
import type * as completions from "lusiajs/editor/completions.ts";
import type * as markupItems from "lusiajs/editor/completion/markup-items.ts";
import type * as apiLookup from "lusiajs/editor/api-lookup.ts";
import type * as autoImport from "lusiajs/editor/auto-import.ts";
import type * as errorPosition from "lusiajs/editor/error-position.ts";
import type * as hover from "lusiajs/editor/hover.ts";
import type * as markdown from "lusiajs/editor/markdown.ts";
import type * as range from "lusiajs/editor/range.ts";
import type * as scriptSymbols from "lusiajs/editor/script/symbols.ts";
import type * as format from "lusiajs/language/format/format.ts";
import type * as formatExpressions from "lusiajs/language/format/format-expressions.ts";
import type * as indentSetting from "lusiajs/language/format/indent-setting.ts";
import type * as prettierParts from "lusiajs/language/format/prettier-parts.ts";
import type * as lint from "lusiajs/language/lint/lint.ts";
import type * as parseImports from "lusiajs/language/parse/imports.ts";
import type * as parseProps from "lusiajs/language/parse/props.ts";
import type * as parseRegions from "lusiajs/language/parse/regions.ts";
import type * as parseSections from "lusiajs/language/parse/sections.ts";
import type * as parseTag from "lusiajs/language/parse/tag.ts";
import type * as runtime from "lusiajs";

/** The namespaces the language tools export, typed from the lusiajs modules they wrap. */
export interface LusiaHost {
  range: typeof range;
  completions: typeof completions;
  completionData: typeof completionData;
  markupItems: typeof markupItems;
  hover: typeof hover;
  markdown: typeof markdown;
  apiLookup: typeof apiLookup;
  autoImport: typeof autoImport;
  errorPosition: typeof errorPosition;
  scriptSymbols: typeof scriptSymbols;
  format: typeof format;
  formatExpressions: typeof formatExpressions;
  indentSetting: typeof indentSetting;
  prettierParts: typeof prettierParts;
  lint: typeof lint;
  parseImports: typeof parseImports;
  parseProps: typeof parseProps;
  parseRegions: typeof parseRegions;
  parseSections: typeof parseSections;
  parseTag: typeof parseTag;
  compiler: typeof compiler;
  api: typeof api;
  runtime: typeof runtime;
}

export const HOST_NAMESPACES = [
  "range",
  "completions",
  "completionData",
  "markupItems",
  "hover",
  "markdown",
  "apiLookup",
  "autoImport",
  "errorPosition",
  "scriptSymbols",
  "format",
  "formatExpressions",
  "indentSetting",
  "prettierParts",
  "lint",
  "parseImports",
  "parseProps",
  "parseRegions",
  "parseSections",
  "parseTag",
  "compiler",
  "api",
  "runtime",
] as const satisfies readonly (keyof LusiaHost)[];
