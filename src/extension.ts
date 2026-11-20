import * as vscode from "vscode";
import { LusiaDiagnostics } from "./diagnostics.ts";
import { LusiaCompletionProvider } from "./providers/completion.ts";
import { LusiaDefinitionProvider } from "./providers/definition.ts";
import { LusiaFormattingProvider } from "./providers/format.ts";
import { LusiaHoverProvider } from "./providers/hover.ts";

const SELECTOR: vscode.DocumentSelector = { language: "lusia" };
const COMPLETION_TRIGGERS = ["<", " ", "@", ":", ".", "{"];

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = new LusiaDiagnostics();
  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument((document) => diagnostics.schedule(document)),
    vscode.workspace.onDidChangeTextDocument((event) => diagnostics.schedule(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.clear(document)),
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      new LusiaCompletionProvider(),
      ...COMPLETION_TRIGGERS,
    ),
    vscode.languages.registerHoverProvider(SELECTOR, new LusiaHoverProvider()),
    vscode.languages.registerDefinitionProvider(SELECTOR, new LusiaDefinitionProvider()),
    vscode.languages.registerDocumentFormattingEditProvider(
      SELECTOR,
      new LusiaFormattingProvider(),
    ),
  );
  vscode.workspace.textDocuments.forEach((document) => diagnostics.schedule(document));
}

export function deactivate(): void {}
