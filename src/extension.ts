import * as vscode from "vscode";
import { LusiaDiagnostics } from "./diagnostics.ts";
import { LusiaCodeActionProvider } from "./providers/code-actions.ts";
import { LusiaColorProvider } from "./providers/colors.ts";
import { LusiaCompletionProvider } from "./providers/completion.ts";
import { LusiaDefinitionProvider } from "./providers/definition.ts";
import { LusiaFoldingRangeProvider } from "./providers/folding.ts";
import { LusiaFormattingProvider } from "./providers/format.ts";
import { LusiaDocumentHighlightProvider } from "./providers/highlights.ts";
import { LusiaHoverProvider } from "./providers/hover.ts";
import { LusiaLinkedEditingProvider } from "./providers/linked.ts";
import { LusiaDocumentLinkProvider } from "./providers/links.ts";
import { LusiaOnTypeFormattingProvider } from "./providers/on-type.ts";
import { LusiaReferenceProvider } from "./providers/references.ts";
import { LusiaRenameProvider } from "./providers/rename.ts";
import { LusiaSelectionRangeProvider } from "./providers/selection.ts";
import { LusiaSignatureHelpProvider } from "./providers/signature.ts";
import { LusiaDocumentSymbolProvider } from "./providers/symbols.ts";
import { hostFor, resetHost } from "./host/load-host.ts";
import { hideStatus, showOutput, SHOW_OUTPUT_COMMAND } from "./host/report.ts";

const RELOAD_COMMAND = "lusia.reloadHost";
const SELECTOR: vscode.DocumentSelector = { language: "lusia" };
const COMPLETION_TRIGGERS = ["<", " ", "@", ":", ".", "{"];
const SIGNATURE_TRIGGERS = ["(", ","];
const CLOSE_TRIGGER = ">";
const CODE_ACTION_KINDS = [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.Refactor];

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = new LusiaDiagnostics();
  context.subscriptions.push(
    diagnostics,
    vscode.commands.registerCommand(RELOAD_COMMAND, () => {
      resetHost();
      diagnostics.scheduleAll();
    }),
    vscode.commands.registerCommand(SHOW_OUTPUT_COMMAND, showOutput),
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      resetHost();
      diagnostics.scheduleAll();
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => updateStatus(editor?.document)),
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
    vscode.languages.registerReferenceProvider(SELECTOR, new LusiaReferenceProvider()),
    vscode.languages.registerSignatureHelpProvider(
      SELECTOR,
      new LusiaSignatureHelpProvider(),
      ...SIGNATURE_TRIGGERS,
    ),
    vscode.languages.registerRenameProvider(SELECTOR, new LusiaRenameProvider()),
    vscode.languages.registerDocumentFormattingEditProvider(
      SELECTOR,
      new LusiaFormattingProvider(),
    ),
    vscode.languages.registerOnTypeFormattingEditProvider(
      SELECTOR,
      new LusiaOnTypeFormattingProvider(),
      CLOSE_TRIGGER,
    ),
    vscode.languages.registerDocumentLinkProvider(SELECTOR, new LusiaDocumentLinkProvider()),
    vscode.languages.registerDocumentSymbolProvider(SELECTOR, new LusiaDocumentSymbolProvider()),
    vscode.languages.registerFoldingRangeProvider(SELECTOR, new LusiaFoldingRangeProvider()),
    vscode.languages.registerSelectionRangeProvider(SELECTOR, new LusiaSelectionRangeProvider()),
    vscode.languages.registerDocumentHighlightProvider(
      SELECTOR,
      new LusiaDocumentHighlightProvider(),
    ),
    vscode.languages.registerLinkedEditingRangeProvider(SELECTOR, new LusiaLinkedEditingProvider()),
    vscode.languages.registerColorProvider(SELECTOR, new LusiaColorProvider()),
    vscode.languages.registerCodeActionsProvider(SELECTOR, new LusiaCodeActionProvider(), {
      providedCodeActionKinds: CODE_ACTION_KINDS,
    }),
  );
  updateStatus(vscode.window.activeTextEditor?.document);
  diagnostics.scheduleAll();
}

function updateStatus(document: vscode.TextDocument | undefined): void {
  if (document?.languageId !== "lusia") {
    hideStatus();
    return;
  }
  void hostFor(document);
}

export function deactivate(): void {}
