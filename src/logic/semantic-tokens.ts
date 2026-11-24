import type { SemanticToken } from "../host/types.ts";

export interface EncodedToken {
  line: number;
  character: number;
  length: number;
  type: number;
  modifiers: number;
}

/** Maps tokens to legend indices. Unknown types are dropped; unknown modifiers are ignored. */
export function legendTokens(
  tokens: readonly SemanticToken[],
  legendTypes: readonly string[],
  legendModifiers: readonly string[],
): EncodedToken[] {
  return tokens.flatMap((token) => {
    const type = legendTypes.indexOf(token.type);
    if (type === -1) return [];
    const modifiers = modifierBits(token.modifiers, legendModifiers);
    return [
      {
        line: token.line,
        character: token.character,
        length: token.length,
        type,
        modifiers,
      },
    ];
  });
}

function modifierBits(
  names: readonly string[],
  legendModifiers: readonly string[],
): number {
  return names.reduce((bits, name) => {
    const index = legendModifiers.indexOf(name);
    return index === -1 ? bits : bits | (1 << index);
  }, 0);
}

/** The LSP encoding: five numbers per token, each position relative to the previous token. */
export function encodeTokens(tokens: readonly EncodedToken[]): number[] {
  const sorted = [...tokens].sort(
    (a, b) => a.line - b.line || a.character - b.character,
  );
  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;
  for (const token of sorted) {
    const deltaLine = token.line - previousLine;
    const deltaCharacter =
      deltaLine === 0 ? token.character - previousCharacter : token.character;
    data.push(
      deltaLine,
      deltaCharacter,
      token.length,
      token.type,
      token.modifiers,
    );
    previousLine = token.line;
    previousCharacter = token.character;
  }
  return data;
}
