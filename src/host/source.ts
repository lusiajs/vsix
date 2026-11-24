import type * as vscode from "vscode";
import type { LusiaHost } from "./types.ts";

/** Gives the language host for a document; providers take one so tests can supply a fake. */
export type HostSource = (
  document: vscode.TextDocument,
) => Promise<LusiaHost | undefined>;

export { hostFor } from "./load-host.ts";
