import * as vscode from "vscode";
import {
  compileDiagnostics,
  cssSourceDiagnostics,
  htmlSourceDiagnostics,
  lintDiagnostics,
  typeScriptDiagnostics,
  type SourceDiagnostics,
  type SourceName,
} from "./diagnostics-sources.ts";
import { htmlDiagnostics } from "./logic/html.ts";
import { hostFor, type HostSource } from "./host/source.ts";
import { TsProject } from "./ts/project.ts";

const DEBOUNCE_MS = 300;
const SOURCES: SourceName[] = [
  "lusia",
  "lusia-lint",
  "typescript",
  "html",
  "css",
];

export class LusiaDiagnostics implements vscode.Disposable {
  private readonly collections = collections();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly versions = new Map<string, number>();

  constructor(private readonly hosts: HostSource = hostFor) {}

  scheduleAll(): void {
    for (const document of vscode.workspace.textDocuments)
      this.schedule(document);
  }

  schedule(document: vscode.TextDocument): void {
    if (document.languageId !== "lusia") return;
    const key = document.uri.toString();
    this.cancel(key);
    this.versions.set(key, document.version);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.check(document);
      }, DEBOUNCE_MS),
    );
  }

  clear(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    this.cancel(key);
    this.versions.delete(key);
    for (const source of SOURCES) this.collections[source].delete(document.uri);
    TsProject.forget(document.fileName);
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.versions.clear();
    for (const source of SOURCES) this.collections[source].dispose();
  }

  private cancel(key: string): void {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  private async check(document: vscode.TextDocument): Promise<void> {
    const version = document.version;
    const host = await this.hosts(document);
    if (this.stale(document, version)) return;
    if (!host) {
      this.apply(document, {});
      return;
    }
    const text = document.getText();
    const sources: SourceDiagnostics = {
      lusia: compileDiagnostics(host, document),
      "lusia-lint": lintDiagnostics(host, document),
      typescript: typeScriptDiagnostics(host, document),
      css: cssSourceDiagnostics(host, document),
    };
    this.apply(document, sources);
    void htmlDiagnostics(host, text).then((issues) => {
      if (this.stale(document, version)) return;
      sources.html = htmlSourceDiagnostics(document, issues);
      this.apply(document, sources);
    });
  }

  /** Sets every collection, dropping a finding another source already reported with the same span. */
  private apply(
    document: vscode.TextDocument,
    sources: SourceDiagnostics,
  ): void {
    const seen = new Set<string>();
    for (const source of SOURCES) {
      const unique = (sources[source] ?? []).filter((item) => {
        const key = `${rangeKey(item.range)}:${item.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.collections[source].set(document.uri, unique);
    }
  }

  private stale(document: vscode.TextDocument, version: number): boolean {
    const key = document.uri.toString();
    return document.version !== version || this.versions.get(key) !== version;
  }
}

function collections(): Record<SourceName, vscode.DiagnosticCollection> {
  return {
    lusia: vscode.languages.createDiagnosticCollection("lusia"),
    "lusia-lint": vscode.languages.createDiagnosticCollection("lusia-lint"),
    typescript: vscode.languages.createDiagnosticCollection("typescript"),
    html: vscode.languages.createDiagnosticCollection("html"),
    css: vscode.languages.createDiagnosticCollection("css"),
  };
}

function rangeKey(range: vscode.Range): string {
  return `${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
}
