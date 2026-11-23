import type { LusiaHost } from "./types.ts";

export interface HostInfo {
  entryPath: string;
  toolsVersion: string;
  lusiaVersion: string | undefined;
  apiVersion: number;
  loadMs: number;
}

export type HostFailure =
  | { cause: "notInstalled"; searched: string[]; lusiaInstalled: boolean; lusiaVersion?: string }
  | { cause: "untrusted"; entryPath: string }
  | { cause: "noEntry"; packagePath: string; toolsVersion: string }
  | { cause: "apiVersion"; entryPath: string; toolsVersion: string; apiVersion: unknown }
  | { cause: "importFailed"; entryPath: string; toolsVersion: string; error: unknown };

export type HostResult =
  { ok: true; host: LusiaHost; info: HostInfo } | { ok: false; failure: HostFailure };
