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

function luciaPosition(error: LuciaError): ErrorPosition {
  return { line: error.line ?? 1, column: error.column ?? 1, message: error.message };
}

function lineInMessage(message: string): number {
  const match = LINE_IN_MESSAGE.exec(message);
  return match ? Number(match[1]) : 1;
}
