import * as vscode from "vscode";
import { cssSymbols, type CssSymbol } from "../logic/css.ts";
import { htmlSymbols, type RegionSymbol } from "../logic/html.ts";
import { cssSymbolKindOf, rangeOf, symbolKindOf } from "./common.ts";

export class LusiaDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const text = document.getText();
    return [
      ...htmlSymbols(text).map((symbol) => htmlSymbol(document, symbol)),
      ...cssSymbols(text).map((symbol) => cssSymbol(document, symbol)),
    ];
  }
}

function htmlSymbol(document: vscode.TextDocument, symbol: RegionSymbol): vscode.DocumentSymbol {
  const result = new vscode.DocumentSymbol(
    symbol.name,
    symbol.detail ?? "",
    symbolKindOf(symbol.kind),
    rangeOf(document, symbol.range),
    rangeOf(document, symbol.selectionRange),
  );
  result.children = symbol.children.map((child) => htmlSymbol(document, child));
  return result;
}

function cssSymbol(document: vscode.TextDocument, symbol: CssSymbol): vscode.DocumentSymbol {
  const result = new vscode.DocumentSymbol(
    symbol.name,
    "",
    cssSymbolKindOf(symbol.kind),
    rangeOf(document, symbol.range),
    rangeOf(document, symbol.selectionRange),
  );
  result.children = (symbol.children ?? []).map((child) => cssSymbol(document, child));
  return result;
}
