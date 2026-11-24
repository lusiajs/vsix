import * as vscode from "vscode";
import {
  LUSIA_PACKAGE,
  SUPPORTED_API_VERSION,
  TOOLS_ENTRY,
  TOOLS_PACKAGE,
} from "./constants.ts";
import type { HostFailure, HostResult } from "./result.ts";

export const SHOW_OUTPUT_COMMAND = "lusia.showOutput";
const TRUST_COMMAND = "workbench.trust.manage";

let channel: vscode.OutputChannel | undefined;
let status: vscode.StatusBarItem | undefined;
const notified = new Set<string>();

export function resetReports(): void {
  notified.clear();
}

export function showOutput(): void {
  outputChannel().show(true);
}

export function hideStatus(): void {
  statusItem().hide();
}

/** Logs once that the tools cannot color markup, so the grammar colors it instead. */
export function reportNoSemanticTokens(): void {
  if (!once("noSemanticTokens")) return;
  log([
    "Language tools have no semanticTokens; Lusia colors fall back to the grammar.",
    "  Update the tools to color components and flow tags from the project.",
  ]);
}

/** Logs the result, updates the status bar, and warns once per project and cause. */
export function reportHost(
  result: HostResult,
  document: vscode.TextDocument,
): void {
  if (result.ok) {
    reportLoaded(result);
  } else {
    reportFailure(result.failure, document);
  }
}

function reportLoaded(result: Extract<HostResult, { ok: true }>): void {
  const { info } = result;
  const lusia = info.lusiaVersion ?? "not found";
  showStatus(
    `Lusia ${info.toolsVersion}`,
    `${info.entryPath}\nEditor API ${info.apiVersion}`,
    false,
  );
  if (!once(`loaded|${info.entryPath}|${info.toolsVersion}|${lusia}`)) return;
  log([
    `Loaded ${TOOLS_PACKAGE}/${TOOLS_ENTRY.slice(2)}`,
    `  path: ${info.entryPath}`,
    `  ${TOOLS_PACKAGE}: ${info.toolsVersion}`,
    `  lusiajs: ${lusia}`,
    `  editor API: ${info.apiVersion}`,
    `  load time: ${info.loadMs.toFixed(1)} ms`,
  ]);
  if (
    info.lusiaVersion !== undefined &&
    info.lusiaVersion !== info.toolsVersion
  ) {
    warnMismatch(info.toolsVersion, info.lusiaVersion);
  }
}

function warnMismatch(toolsVersion: string, lusiaVersion: string): void {
  const fix = `bun add -d ${TOOLS_PACKAGE}@${lusiaVersion}`;
  const message = `${TOOLS_PACKAGE} ${toolsVersion} does not match lusiajs ${lusiaVersion}. Run: ${fix}`;
  log([`Warning: ${message}`]);
  void vscode.window
    .showWarningMessage(message, "Copy command")
    .then((choice) => {
      if (choice === "Copy command") void vscode.env.clipboard.writeText(fix);
    });
}

function reportFailure(
  failure: HostFailure,
  document: vscode.TextDocument,
): void {
  const message = failureMessage(failure);
  showStatus("Lusia: not loaded", message.summary, true);
  const key = `failed|${failureKey(failure, document)}`;
  if (!once(key)) return;
  log([`Not loaded: ${message.summary}`, ...message.details]);
  const actions = failureActions(failure);
  void vscode.window
    .showWarningMessage(
      message.summary,
      ...actions.map((action) => action.label),
    )
    .then((choice) => {
      const action = actions.find((candidate) => candidate.label === choice);
      action?.run();
    });
}

interface FailureMessage {
  summary: string;
  details: string[];
}

function failureMessage(failure: HostFailure): FailureMessage {
  switch (failure.cause) {
    case "notInstalled":
      return notInstalledMessage(
        failure.lusiaInstalled,
        failure.lusiaVersion,
        failure.searched,
      );
    case "untrusted":
      return {
        summary:
          "Trust this folder to let Lusia use the project's VS Code support.",
        details: [`Entry: ${failure.entryPath}`],
      };
    case "noEntry":
      return {
        summary: `${TOOLS_PACKAGE} ${failure.toolsVersion} has no ${TOOLS_ENTRY.slice(2)} entry. Update: bun update ${TOOLS_PACKAGE}`,
        details: [`Package: ${failure.packagePath}`],
      };
    case "apiVersion":
      return {
        summary: `${TOOLS_PACKAGE} ${failure.toolsVersion} uses editor API ${String(failure.apiVersion)}; this extension supports ${SUPPORTED_API_VERSION}. Update the extension or update ${TOOLS_PACKAGE}.`,
        details: [`Entry: ${failure.entryPath}`],
      };
    case "importFailed":
      return {
        summary: "Lusia VS Code support failed to load. Reinstall: bun install",
        details: [
          `Entry: ${failure.entryPath}`,
          String(failure.error),
          errorStack(failure.error),
        ],
      };
  }
}

function notInstalledMessage(
  lusiaInstalled: boolean,
  lusiaVersion: string | undefined,
  searched: string[],
): FailureMessage {
  const summary = lusiaInstalled
    ? `Lusia VS Code support is not installed. Run: bun add -d ${TOOLS_PACKAGE}@${lusiaVersion}`
    : `Lusia is not installed in this project. Run: bun add -d ${LUSIA_PACKAGE} ${TOOLS_PACKAGE}`;
  return {
    summary,
    details: ["Searched:", ...searched.map((path) => `  ${path}`)],
  };
}

function failureActions(
  failure: HostFailure,
): { label: string; run: () => unknown }[] {
  const output = { label: "Open output", run: showOutput };
  if (failure.cause === "untrusted") {
    return [
      {
        label: "Manage Workspace Trust",
        run: () => vscode.commands.executeCommand(TRUST_COMMAND),
      },
      output,
    ];
  }
  return [output];
}

function failureKey(
  failure: HostFailure,
  document: vscode.TextDocument,
): string {
  if (failure.cause === "notInstalled")
    return `notInstalled|${document.fileName}`;
  if (failure.cause === "noEntry") return `noEntry|${failure.packagePath}`;
  return `${failure.cause}|${"entryPath" in failure ? failure.entryPath : ""}`;
}

function errorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : "";
}

function once(key: string): boolean {
  if (notified.has(key)) return false;
  notified.add(key);
  return true;
}

function log(lines: string[]): void {
  const out = outputChannel();
  for (const line of lines) out.appendLine(line);
}

function outputChannel(): vscode.OutputChannel {
  channel ??= vscode.window.createOutputChannel("Lusia");
  return channel;
}

function statusItem(): vscode.StatusBarItem {
  if (status === undefined) {
    status = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      0,
    );
    status.command = SHOW_OUTPUT_COMMAND;
  }
  return status;
}

function showStatus(text: string, tooltip: string, warning: boolean): void {
  const item = statusItem();
  item.text = text;
  item.tooltip = tooltip;
  item.backgroundColor = warning
    ? new vscode.ThemeColor("statusBarItem.warningBackground")
    : undefined;
  item.show();
}
