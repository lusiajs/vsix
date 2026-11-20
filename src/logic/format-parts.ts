import { format } from "prettier";
import { protectExpressions, restoreExpressions } from "../../../shared/format-expressions.ts";

export function formatScript(code: string): Promise<string> {
  return formatCode(code, "typescript");
}

export function formatStyle(code: string, plainCss: boolean): Promise<string> {
  return formatCode(code, plainCss ? "css" : "scss");
}

export async function formatMarkup(markup: string): Promise<string> {
  const protectedMarkup = protectExpressions(markup);
  const html = await format(protectedMarkup.text, { parser: "html" });
  return restoreExpressions(html, protectedMarkup.expressions).trim();
}

async function formatCode(code: string, parser: "typescript" | "css" | "scss"): Promise<string> {
  if (code.trim() === "") return "";
  return (await format(code, { parser })).trim();
}
