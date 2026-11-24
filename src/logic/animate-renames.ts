export interface RenameFix {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

const KEY_RENAMES: ReadonlyMap<string, string> = new Map([
  ["style", "play"],
  ["when", "on"],
  ["more", "options"],
  ["default", "ease"],
]);

const NAME_RENAMES: ReadonlyMap<string, string> = new Map([
  ["WHEN", "ON"],
  ["MIDWAY.FINISH", "MIDWAY.WAIT"],
  ["MIDWAY.SKIP", "MIDWAY.JUMP_TO_END"],
  ["MIDWAY.IGNORE", "MIDWAY.KEEP_CURRENT"],
  ["MIDWAY.TURN", "MIDWAY.SWITCH"],
]);

// A key is an old name before a colon; an enum name is an old name before its member or as a bare MIDWAY member.
const OLD_NAME = /\b(?:style|when|more|default)(?=\s*:)|\bWHEN(?=\.)|\bMIDWAY\.(?:FINISH|SKIP|IGNORE|TURN)\b/;

/** The first old animate name in the range, with the text that replaces it. */
export function animateRenameFix(text: string, start: number, end: number): RenameFix | undefined {
  const match = OLD_NAME.exec(text.slice(start, end));
  if (match === null) return undefined;
  const replacement = KEY_RENAMES.get(match[0]) ?? NAME_RENAMES.get(match[0]);
  if (replacement === undefined) return undefined;
  const fixStart = start + match.index;
  return { start: fixStart, end: fixStart + match[0].length, text: replacement };
}

export function isRenameMessage(message: string): boolean {
  return /\brenamed\b/.test(message);
}
