import * as vscode from "vscode";
import { LuciaDiagnostics } from "./diagnostics.ts";
import { LuciaCompletionProvider } from "./providers/completion.ts";
import { LuciaDefinitionProvider } from "./providers/definition.ts";
import { LuciaFormattingProvider } from "./providers/format.ts";
import { LuciaHoverProvider } from "./providers/hover.ts";

const SELECTOR: vscode.DocumentSelector = { language: "lucia" };
const COMPLETION_TRIGGERS = ["<", " ", "@", ":"];

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = new LuciaDiagnostics();
  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument((document) => diagnostics.schedule(document)),
    vscode.workspace.onDidChangeTextDocument((event) => diagnostics.schedule(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.clear(document)),
    vscode.languages.registerCompletionItemProvider(SELECTOR, new LuciaCompletionProvider(), ...COMPLETION_TRIGGERS),
    vscode.languages.registerHoverProvider(SELECTOR, new LuciaHoverProvider()),
    vscode.languages.registerDefinitionProvider(SELECTOR, new LuciaDefinitionProvider()),
    vscode.languages.registerDocumentFormattingEditProvider(SELECTOR, new LuciaFormattingProvider()),
  );
  vscode.workspace.textDocuments.forEach((document) => diagnostics.schedule(document));
}

export function deactivate(): void {}
