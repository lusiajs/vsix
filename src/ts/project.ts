import { resolve } from "node:path";
import { forgetSource, rememberSource } from "./modules.ts";
import {
  completionDetailsOf,
  completionsOf,
  definitionsOf,
  hoverOf,
  issuesOf,
  referencesOf,
  renameOf,
  signatureOf,
  type QueryContext,
} from "./queries.ts";
import { projectSource, type ProjectSource } from "./source.ts";
import type {
  TsCompletion,
  TsCompletionDetails,
  TsEdit,
  TsHover,
  TsIssue,
  TsLocation,
  TsSignature,
} from "./types.ts";
import { Workspace } from "./workspace.ts";

/** The TypeScript program behind one open `.lusia` component. */
export class TsProject {
  private static readonly cache = new Map<string, TsProject>();

  static open(fileName: string, text: string): TsProject {
    const realPath = resolve(fileName);
    const cached = TsProject.cache.get(realPath);
    if (cached) {
      cached.update(text);
      return cached;
    }
    const project = new TsProject(realPath, text);
    TsProject.cache.set(realPath, project);
    return project;
  }

  static forget(fileName: string): void {
    const realPath = resolve(fileName);
    const project = TsProject.cache.get(realPath);
    if (project === undefined) return;
    TsProject.cache.delete(realPath);
    project.workspace?.removeRoot(project.virtualPath);
    forgetSource(realPath);
  }

  private readonly realPath: string;
  private readonly virtualPath: string;
  private readonly workspace: Workspace | undefined;
  private text: string;
  private sourceLength: number;
  private source: ProjectSource;

  private constructor(realPath: string, text: string) {
    this.realPath = realPath;
    this.virtualPath = `${realPath}.ts`;
    this.text = text;
    this.sourceLength = text.length;
    rememberSource(realPath, text);
    this.source = projectSource(text);
    this.workspace = Workspace.for(realPath);
    this.workspace?.files.set(this.virtualPath, this.source.text);
    this.workspace?.addRoot(this.virtualPath);
  }

  update(text: string): void {
    if (text === this.text) return;
    this.text = text;
    this.sourceLength = text.length;
    rememberSource(this.realPath, text);
    this.source = projectSource(text);
    this.workspace?.files.set(this.virtualPath, this.source.text);
  }

  completions(offset: number): TsCompletion[] {
    const context = this.context(offset);
    return context === undefined ? [] : completionsOf(context, offset);
  }

  completionDetails(
    offset: number,
    name: string,
    source?: string,
  ): TsCompletionDetails | undefined {
    const context = this.context(offset);
    return context === undefined ? undefined : completionDetailsOf(context, offset, name, source);
  }

  hover(offset: number): TsHover | undefined {
    const context = this.context(offset);
    return context === undefined ? undefined : hoverOf(context, offset);
  }

  diagnostics(): TsIssue[] {
    const context = this.readyContext();
    return context === undefined ? [] : issuesOf(context);
  }

  definitions(offset: number): TsLocation[] {
    const context = this.context(offset);
    return context === undefined ? [] : definitionsOf(context, offset);
  }

  references(offset: number): TsLocation[] {
    const context = this.context(offset);
    return context === undefined ? [] : referencesOf(context, offset);
  }

  rename(offset: number, newName: string): TsEdit[] {
    const context = this.context(offset);
    return context === undefined ? [] : renameOf(context, offset, newName);
  }

  signatureHelp(offset: number): TsSignature | undefined {
    const context = this.context(offset);
    return context === undefined ? undefined : signatureOf(context, offset);
  }

  /** The project path the editor opened, which is also the file locations point at. */
  get fileName(): string {
    return this.realPath;
  }

  private context(offset: number): QueryContext | undefined {
    if (offset < 0 || offset > this.sourceLength) return undefined;
    return this.readyContext();
  }

  private readyContext(): QueryContext | undefined {
    const workspace = this.workspace;
    if (workspace === undefined) return undefined;
    workspace.refreshComponents();
    return {
      typescript: workspace.typescript,
      service: workspace.service,
      virtualPath: this.virtualPath,
      spans: this.source.spans,
      sourceLength: this.sourceLength,
    };
  }
}
