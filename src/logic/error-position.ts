import { LuciaError } from "../../../../src/compiler/errors.ts";

export interface ErrorPosition {
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  message: string;
}

const LINE_IN_MESSAGE = /\bline (\d+)/;

export function errorPosition(error: unknown): ErrorPosition {
  if (error instanceof LuciaError) return luciaPosition(error);
  const message = error instanceof Error ? error.message : String(error);
  return { line: lineInMessage(message), column: 1, message };
}

// LuciaError puts `file:line:column: ` in front of the message. The editor shows the position itself.
function luciaPosition(error: LuciaError): ErrorPosition {
  const prefix = `${error.file}:${error.line}:${error.column}: `;
  return { line: error.line, column: error.column, message: error.message.replace(prefix, "") };
}

function lineInMessage(message: string): number {
  const match = LINE_IN_MESSAGE.exec(message);
  return match ? Number(match[1]) : 1;
}
