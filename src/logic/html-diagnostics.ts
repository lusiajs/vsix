import type { ConfigData, HtmlValidate, Message } from "html-validate/browser";
import type { LusiaHost } from "../host/types.ts";
import type { RegionDiagnostic } from "./region-types.ts";

const FILENAME = "component.lusia";

/** Structural rules only: Lusia markup, components and flow tags stay legal. */
const CONFIG: ConfigData = {
  elements: ["html5"],
  rules: {
    "attr-spacing": "error",
    "close-attr": "error",
    "close-order": "error",
    "element-permitted-content": "error",
    "element-permitted-occurrences": "error",
    "no-dup-attr": "error",
    "no-dup-id": "error",
    "no-implicit-close": "error",
    "no-self-closing": "error",
    "void-content": "error",
  },
};

const START_TAG = /^<([A-Za-z][\w.-]*)/;
const NO_SELF_CLOSING = "no-self-closing";
// ELSE and ELSEIF split an IF into branches and never close, so the checker must not see them.
const BRANCH_TAG = /<(?:ELSEIF|ELSE)(?=[\s/>])[^>]*>/g;

let validator: Promise<HtmlValidate> | undefined;

export async function htmlDiagnostics(
  host: LusiaHost,
  text: string,
): Promise<RegionDiagnostic[]> {
  try {
    const report = await (
      await htmlValidate()
    ).validateSource({
      data: markupView(host, text),
      filename: FILENAME,
      line: 1,
      column: 1,
      offset: 0,
    });
    const messages = report.results.flatMap((result) => result.messages);
    return messages
      .filter((message) => !isLusiaSelfClose(host, text, message))
      .map((message) => toDiagnostic(text, message))
      .sort((a, b) => a.start - b.start || a.end - b.end);
  } catch {
    return [];
  }
}

// html-validate is large, so it loads on the first check, not when the extension starts.
function htmlValidate(): Promise<HtmlValidate> {
  validator ??= import("html-validate/browser").then(
    ({ HtmlValidate }) => new HtmlValidate(CONFIG),
  );
  return validator;
}

/** The markup with section content and expressions blanked, on the same offsets and lines. */
function markupView(host: LusiaHost, text: string): string {
  return blankBranchTags(blankExpressions(host, blankSections(host, text)));
}

function blankSections(host: LusiaHost, text: string): string {
  const sections = host.parseSections.findSections(text);
  if (sections.length === 0) return text;
  let view = "";
  let cursor = 0;
  for (const section of sections) {
    view += text.slice(cursor, section.contentStart);
    view += blank(text.slice(section.contentStart, section.contentEnd), " ");
    cursor = section.contentEnd;
  }
  return view + text.slice(cursor);
}

function blankExpressions(host: LusiaHost, text: string): string {
  let view = "";
  let index = 0;
  while (index < text.length) {
    if (text.charAt(index) === "{") {
      const end = host.formatExpressions.expressionEnd(text, index);
      if (end !== -1) {
        view += blank(text.slice(index, end + 1), "x");
        index = end + 1;
        continue;
      }
    }
    view += text.charAt(index);
    index++;
  }
  return view;
}

function blankBranchTags(text: string): string {
  return text.replace(BRANCH_TAG, (tag) => blank(tag, " "));
}

function blank(value: string, filler: string): string {
  return value.replace(/[^\n]/g, filler);
}

function isLusiaSelfClose(
  host: LusiaHost,
  text: string,
  message: Message,
): boolean {
  if (message.ruleId !== NO_SELF_CLOSING) return false;
  const name = tagNameBefore(text, message.offset);
  if (!name) return false;
  return (
    host.markupItems.isFlowTag(name) ||
    host.parseImports.findComponentImport(text, name) !== undefined
  );
}

function tagNameBefore(text: string, offset: number): string | undefined {
  const open = text.lastIndexOf("<", offset);
  if (open === -1) return undefined;
  return START_TAG.exec(text.slice(open))?.[1];
}

function toDiagnostic(text: string, message: Message): RegionDiagnostic {
  const start = clamp(message.offset, text.length);
  const end = clamp(start + Math.max(message.size, 1), text.length);
  return {
    start,
    end: Math.max(start, end),
    message: message.message,
    severity: message.severity === 2 ? "error" : "warning",
    code: message.ruleId,
  };
}

function clamp(offset: number, length: number): number {
  return Math.max(0, Math.min(offset, length));
}
