// A minimal `vscode` module for provider tests: only the classes and registrations the extension uses.
export class Position {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position,
  ) {}
}

export class MarkdownString {
  constructor(readonly value = "") {}
}

export class SnippetString {
  constructor(readonly value = "") {}
}

export class CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: unknown;
  insertText?: unknown;
  sortText?: string;
  range?: Range;
  additionalTextEdits?: TextEdit[];
  data?: unknown;
  constructor(label: string, kind?: number) {
    this.label = label;
    this.kind = kind;
  }
}

export class Hover {
  constructor(
    readonly contents: MarkdownString,
    readonly range?: Range,
  ) {}
}

export class Location {
  constructor(
    readonly uri: Uri,
    readonly range: Range,
  ) {}
}

export class TextEdit {
  constructor(
    readonly range: Range,
    readonly newText: string,
  ) {}
  static replace(range: Range, newText: string) {
    return new TextEdit(range, newText);
  }
  static insert(position: Position, newText: string) {
    return new TextEdit(new Range(position, position), newText);
  }
}

export class Diagnostic {
  source?: string;
  code?: string | number;
  constructor(
    readonly range: Range,
    readonly message: string,
    readonly severity: number,
  ) {}
}

export class DocumentSymbol {
  children: DocumentSymbol[] = [];
  constructor(
    readonly name: string,
    readonly detail: string,
    readonly kind: number,
    readonly range: Range,
    readonly selectionRange: Range,
  ) {}
}

export class FoldingRange {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly kind?: number,
  ) {}
}

export class SelectionRange {
  parent?: SelectionRange;
  constructor(readonly range: Range) {}
}

export class DocumentHighlight {
  constructor(
    readonly range: Range,
    readonly kind: number,
  ) {}
}

export class DocumentLink {
  tooltip?: string;
  constructor(
    readonly range: Range,
    readonly target: Uri,
  ) {}
}

export class LinkedEditingRanges {
  constructor(readonly ranges: Range[]) {}
}

export class SignatureHelp {
  signatures: SignatureInformation[] = [];
  activeSignature = 0;
  activeParameter = 0;
}

export class SignatureInformation {
  parameters: ParameterInformation[] = [];
  constructor(
    readonly label: string,
    readonly documentation?: string,
  ) {}
}

export class ParameterInformation {
  constructor(
    readonly label: string,
    readonly documentation?: string,
  ) {}
}

export class Color {
  constructor(
    readonly red: number,
    readonly green: number,
    readonly blue: number,
    readonly alpha: number,
  ) {}
}

export class SemanticTokensLegend {
  constructor(
    readonly tokenTypes: string[],
    readonly tokenModifiers: string[],
  ) {}
}

export class SemanticTokens {
  constructor(
    readonly data: Uint32Array,
    readonly resultId?: string,
  ) {}
}

export class ColorInformation {
  constructor(
    readonly range: Range,
    readonly color: Color,
  ) {}
}

export class ColorPresentation {
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
  constructor(readonly label: string) {}
}

export class CodeAction {
  diagnostics?: Diagnostic[];
  edit?: WorkspaceEdit;
  constructor(
    readonly title: string,
    readonly kind?: string,
  ) {}
}

export class WorkspaceEdit {
  private readonly changes = new Map<
    string,
    Array<{ uri: Uri; range: Range; newText: string }>
  >();
  replace(uri: Uri, range: Range, newText: string): void {
    const key = uri.toString();
    this.changes.set(key, [
      ...(this.changes.get(key) ?? []),
      { uri, range, newText },
    ]);
  }
  insert(uri: Uri, position: Position, newText: string): void {
    this.replace(uri, new Range(position, position), newText);
  }
  get size(): number {
    return [...this.changes.values()].reduce(
      (total, edits) => total + edits.length,
      0,
    );
  }
  entries(): Array<Array<{ uri: Uri; range: Range; newText: string }>> {
    return [...this.changes.values()];
  }
}

export class Uri {
  constructor(
    readonly scheme: string,
    readonly fsPath: string,
  ) {}
  toString(): string {
    return `${this.scheme}://${this.fsPath}`;
  }
  static file(path: string): Uri {
    return new Uri("file", path);
  }
  static parse(value: string): Uri {
    return new Uri("external", value);
  }
}

export const CompletionItemKind = {
  Text: 0,
  Method: 1,
  Function: 2,
  Constructor: 3,
  Field: 4,
  Variable: 5,
  Class: 6,
  Interface: 7,
  Module: 8,
  Property: 9,
  Unit: 10,
  Value: 11,
  Enum: 12,
  Keyword: 13,
  Snippet: 14,
  Color: 15,
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const SymbolKind = {
  File: 0,
  Module: 1,
  Namespace: 2,
  Package: 3,
  Class: 4,
  Method: 5,
  Property: 6,
  Field: 7,
  Constructor: 8,
  Enum: 9,
  Interface: 10,
  Function: 11,
  Variable: 12,
  Constant: 13,
  String: 14,
  Number: 15,
  Boolean: 16,
  Array: 17,
  Object: 18,
  Key: 19,
  Null: 20,
  EnumMember: 21,
  Struct: 22,
  Event: 23,
  Operator: 24,
  TypeParameter: 25,
};

export const FoldingRangeKind = { Comment: 1, Imports: 2, Region: 3 };
export const DocumentHighlightKind = { Text: 0, Read: 1, Write: 2 };
export const CodeActionKind = {
  QuickFix: "quickfix",
  Refactor: "refactor",
  RefactorExtract: "refactor.extract",
  Source: "source",
};

export interface DiagnosticCollection {
  get(uri: Uri): Diagnostic[] | undefined;
  set(uri: Uri, diagnostics: readonly Diagnostic[]): void;
  delete(uri: Uri): void;
  dispose(): void;
}

export interface Captured {
  collections: Record<string, DiagnosticCollection>;
  triggers: Record<string, string[]>;
  completion?: any;
  hover?: any;
  definition?: any;
  references?: any;
  signature?: any;
  rename?: any;
  format?: any;
  onType?: any;
  links?: any;
  symbols?: any;
  folding?: any;
  selection?: any;
  highlights?: any;
  linked?: any;
  colors?: any;
  codeActions?: any;
  semanticTokens?: any;
  change?: (event: { document: any }) => void;
  close?: (document: any) => void;
}

type Registration = (
  selector: unknown,
  provider: any,
  ...rest: unknown[]
) => { dispose(): void };

export function createVscode() {
  const captured: Captured = { collections: {}, triggers: {} };
  const collection = (name: string): DiagnosticCollection => {
    const entries = new Map<string, Diagnostic[]>();
    const created: DiagnosticCollection = {
      get: (uri) => entries.get(uri.toString()),
      set: (uri, diagnostics) => entries.set(uri.toString(), [...diagnostics]),
      delete: (uri) => entries.delete(uri.toString()),
      dispose: () => entries.clear(),
    };
    captured.collections[name] = created;
    return created;
  };
  const register = (
    name: keyof Captured,
    withTriggers = false,
  ): Registration => {
    return (_selector, provider, ...rest) => {
      (captured as unknown as Record<string, unknown>)[name] = provider;
      if (withTriggers) captured.triggers[name] = rest as string[];
      return { dispose() {} };
    };
  };
  const languages = {
    createDiagnosticCollection: collection,
    registerCompletionItemProvider: register("completion", true),
    registerHoverProvider: register("hover"),
    registerDefinitionProvider: register("definition"),
    registerReferenceProvider: register("references"),
    registerSignatureHelpProvider: register("signature", true),
    registerRenameProvider: register("rename"),
    registerDocumentFormattingEditProvider: register("format"),
    registerOnTypeFormattingEditProvider: register("onType", true),
    registerDocumentLinkProvider: register("links"),
    registerDocumentSymbolProvider: register("symbols"),
    registerFoldingRangeProvider: register("folding"),
    registerSelectionRangeProvider: register("selection"),
    registerDocumentHighlightProvider: register("highlights"),
    registerLinkedEditingRangeProvider: register("linked"),
    registerColorProvider: register("colors"),
    registerCodeActionsProvider: register("codeActions"),
    registerDocumentSemanticTokensProvider: register("semanticTokens"),
  };
  const window = {
    createOutputChannel: (_name: string) => ({
      appendLine() {},
      show() {},
      dispose() {},
    }),
  };
  const workspace = {
    onDidOpenTextDocument: (callback: (document: any) => void) => {
      captured.change = (event) => callback(event.document);
      return { dispose() {} };
    },
    onDidChangeTextDocument: (callback: (event: { document: any }) => void) => {
      captured.change = callback;
      return { dispose() {} };
    },
    onDidCloseTextDocument: (callback: (document: any) => void) => {
      captured.close = callback;
      return { dispose() {} };
    },
    textDocuments: [] as unknown[],
    isTrusted: true,
    getWorkspaceFolder: (
      _uri: unknown,
    ): { uri: { fsPath: string } } | undefined => undefined,
  };
  return {
    Position,
    Range,
    MarkdownString,
    SnippetString,
    CompletionItem,
    CompletionItemKind,
    Hover,
    Location,
    TextEdit,
    Diagnostic,
    DiagnosticSeverity,
    DocumentSymbol,
    SymbolKind,
    FoldingRange,
    FoldingRangeKind,
    SelectionRange,
    DocumentHighlight,
    DocumentHighlightKind,
    DocumentLink,
    LinkedEditingRanges,
    SignatureHelp,
    SignatureInformation,
    ParameterInformation,
    Color,
    ColorInformation,
    ColorPresentation,
    CodeAction,
    CodeActionKind,
    WorkspaceEdit,
    Uri,
    languages,
    window,
    workspace,
    SemanticTokens,
    SemanticTokensLegend,
    __captured: captured,
  };
}

// The providers are typed against the real editor document, so the fake one is passed as one.
export function fakeDocument(fileName: string, text: string, version = 1): any {
  const starts = [0];
  for (let index = 0; index < text.length; index++)
    if (text[index] === "\n") starts.push(index + 1);
  const offsetAt = (position: Position) =>
    (starts[position.line] ?? 0) + position.character;
  const positionAt = (offset: number) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1]! <= offset) line++;
    return new Position(line, offset - starts[line]!);
  };
  return {
    fileName,
    languageId: "lusia",
    version,
    uri: Uri.file(fileName),
    lineCount: starts.length,
    getText: () => text,
    offsetAt,
    positionAt,
    lineAt: (line: number) => {
      const end =
        line + 1 < starts.length
          ? starts[line + 1]! - 1 - starts[line]!
          : text.length - starts[line]!;
      return {
        range: new Range(new Position(line, 0), new Position(line, end)),
      };
    },
  };
}
