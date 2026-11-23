import { describe, expect, test } from "bun:test";
import "./mock-vscode.ts";
import { fakeDocument } from "./vscode-stub.ts";
import type { LusiaHost, SemanticToken } from "../../src/host/types.ts";

const { LusiaSemanticTokensProvider, SEMANTIC_TOKENS_LEGEND } =
  await import("../../src/providers/semantic-tokens.ts");

const document = fakeDocument("/project/src/App.lusia", "<EACH {rows} as={row}></EACH>");

function hostReturning(tokens: SemanticToken[]): LusiaHost {
  const semanticTokens = {
    semanticTokens: () => tokens,
    TOKEN_TYPES: ["keyword", "decorator", "event", "parameter", "class", "enumMember"],
    TOKEN_MODIFIERS: ["readonly"],
  };
  return { semanticTokens } as unknown as LusiaHost;
}

function providerFor(host: LusiaHost | undefined) {
  return new LusiaSemanticTokensProvider(async () => host);
}

async function dataOf(host: LusiaHost | undefined): Promise<number[] | undefined> {
  const tokens = await providerFor(host).provideDocumentSemanticTokens(document);
  return tokens === undefined ? undefined : Array.from(tokens.data);
}

describe("semantic tokens provider", () => {
  test("registers a legend with the fixed types and modifiers", () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toEqual([
      "keyword",
      "decorator",
      "event",
      "parameter",
      "class",
      "enumMember",
    ]);
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toEqual(["readonly"]);
  });

  test("encodes legend indices, modifier bits and delta positions", async () => {
    const data = await dataOf(
      hostReturning([
        { line: 0, character: 0, length: 4, type: "keyword", modifiers: [] },
        { line: 0, character: 6, length: 3, type: "class", modifiers: [] },
        {
          line: 2,
          character: 4,
          length: 5,
          type: "enumMember",
          modifiers: ["readonly"],
        },
      ]),
    );
    expect(data).toEqual([0, 0, 4, 0, 0, 0, 6, 3, 4, 0, 2, 4, 5, 5, 1]);
  });

  test("skips token types the legend does not know", async () => {
    const data = await dataOf(
      hostReturning([
        { line: 0, character: 0, length: 4, type: "macro", modifiers: [] },
        {
          line: 1,
          character: 2,
          length: 3,
          type: "event",
          modifiers: ["deprecated"],
        },
      ]),
    );
    expect(data).toEqual([1, 2, 3, 2, 0]);
  });

  test("returns undefined when the host has no semanticTokens namespace", async () => {
    const host = { range: {} } as unknown as LusiaHost;
    expect(await dataOf(host)).toBeUndefined();
  });

  test("returns undefined when no host is loaded", async () => {
    expect(await dataOf(undefined)).toBeUndefined();
  });
});
