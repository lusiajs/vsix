import * as vscode from "vscode";
import { encodeTokens, legendTokens } from "../logic/semantic-tokens.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { reportNoSemanticTokens } from "../host/report.ts";

/** Fixed so VS Code has the legend before any project loads. Tokens the tools add later are skipped. */
const LEGEND_TYPES = [
  "keyword",
  "decorator",
  "event",
  "parameter",
  "class",
  "enumMember",
];
const LEGEND_MODIFIERS = ["readonly"];

export const SEMANTIC_TOKENS_LEGEND = new vscode.SemanticTokensLegend(
  LEGEND_TYPES,
  LEGEND_MODIFIERS,
);

export class LusiaSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
  ): Promise<vscode.SemanticTokens | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    if (host.semanticTokens === undefined) {
      reportNoSemanticTokens();
      return undefined;
    }
    const tokens = host.semanticTokens.semanticTokens(document.getText());
    const legend = legendTokens(tokens, LEGEND_TYPES, LEGEND_MODIFIERS);
    return new vscode.SemanticTokens(new Uint32Array(encodeTokens(legend)));
  }
}
