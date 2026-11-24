import type { LusiaHost } from "./types.ts";

export interface HostInfo {
  entryPath: string;
  packageName: string;
  toolsVersion: string;
  lusiaVersion: string | undefined;
  apiVersion: number;
  loadMs: number;
}

export type HostFailure =
  | { cause: "notInstalled"; searched: string[]; lusiaInstalled: boolean; lusiaVersion?: string }
  | { cause: "untrusted"; entryPath: string }
  | { cause: "noEntry"; packageName: string; packagePath: string; toolsVersion: string }
  | {
      cause: "apiVersion";
      packageName: string;
      entryPath: string;
      toolsVersion: string;
      apiVersion: unknown;
    }
  | {
      cause: "importFailed";
      packageName: string;
      entryPath: string;
      toolsVersion: string;
      error: unknown;
    };

export type HostResult =
  { ok: true; host: LusiaHost; info: HostInfo } | { ok: false; failure: HostFailure };
