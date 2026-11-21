import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// The tokenizer packages live in the extension's own node_modules, so they are loaded from there.
const EXTENSION = join(import.meta.dir, "../..");
const FIXTURES = join(import.meta.dir, "../fixtures/grammars");
const extensionRequire = createRequire(join(EXTENSION, "package.json"));

interface OnigModule {
  loadWASM(data: ArrayBuffer): Promise<void>;
  OnigScanner: new (patterns: string[]) => unknown;
  OnigString: new (text: string) => unknown;
}

interface TokenLine {
  tokens: Array<{ startIndex: number; endIndex: number; scopes: string[] }>;
  ruleStack: unknown;
}

interface TextmateGrammar {
  tokenizeLine(line: string, ruleStack: unknown): TokenLine;
}

interface TextmateModule {
  Registry: new (options: {
    onigLib: Promise<unknown>;
    loadGrammar: (scopeName: string) => Promise<unknown>;
  }) => { loadGrammar(scopeName: string): Promise<TextmateGrammar | null> };
  parseRawGrammar(content: string, path: string): unknown;
}

const GRAMMAR_FILES: Record<string, string> = {
  "source.lusia": join(EXTENSION, "syntaxes/lusia.tmLanguage.json"),
  "source.ts": join(FIXTURES, "typescript.json"),
  "source.js": join(FIXTURES, "javascript.json"),
  "source.css": join(FIXTURES, "css.json"),
  "source.css.scss": join(FIXTURES, "scss.json"),
  "text.html.basic": join(FIXTURES, "html.json"),
};

export interface Token {
  text: string;
  scopes: string[];
}

let grammarPromise: Promise<TextmateGrammar> | undefined;

async function loadLusiaGrammar(): Promise<TextmateGrammar> {
  const onig = extensionRequire("vscode-oniguruma") as OnigModule;
  const textmate = extensionRequire("vscode-textmate") as TextmateModule;
  const wasm = readFileSync(extensionRequire.resolve("vscode-oniguruma/release/onig.wasm"));
  await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const onigLib = Promise.resolve({
    createOnigScanner: (patterns: string[]) => new onig.OnigScanner(patterns),
    createOnigString: (text: string) => new onig.OnigString(text),
  });
  const registry = new textmate.Registry({
    onigLib,
    loadGrammar: async (scopeName) => {
      const path = GRAMMAR_FILES[scopeName];
      return path ? textmate.parseRawGrammar(readFileSync(path, "utf8"), path) : null;
    },
  });
  const grammar = await registry.loadGrammar("source.lusia");
  if (!grammar) throw new Error("source.lusia grammar did not load");
  return grammar;
}

/** Tokenizes a whole .lusia document, line by line, with the real grammars. */
export async function tokenizeLusia(source: string): Promise<Token[][]> {
  grammarPromise ??= loadLusiaGrammar();
  const grammar = await grammarPromise;
  let ruleStack: unknown = null;
  return source.split("\n").map((line) => {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    return result.tokens.map((token) => ({
      text: line.slice(token.startIndex, token.endIndex),
      scopes: token.scopes,
    }));
  });
}
