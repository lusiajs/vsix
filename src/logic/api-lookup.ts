import { api, type ApiEntry } from "../../../../reference/api.ts";

/** The name a script uses for an entry, such as `variable.compute` for `variable.compute()`. */
export function apiKey(entry: ApiEntry): string {
  return entry.name.replace(/^function /, "").split(/[(<]/)[0] ?? entry.name;
}

/** The lucia export an entry comes from: `variable` for `variable.compute`. */
export function importKey(entry: ApiEntry): string {
  return apiKey(entry).split(".")[0] ?? apiKey(entry);
}

export function findScriptApi(key: string): ApiEntry | undefined {
  return api.find((entry) => isScriptEntry(entry) && apiKey(entry) === key);
}

export function findApiById(id: string): ApiEntry | undefined {
  return api.find((entry) => entry.id === id);
}

/** An enum object such as `EASE`, the entry that lists its members. */
export function findEnum(name: string): ApiEntry | undefined {
  return api.find(
    (entry) => entry.kind === "value" && entry.members !== undefined && entry.name === name,
  );
}

/** Script names that come from `lucia` and can be auto-imported. `setup` is a hook, not an export. */
export function importableApi(): ApiEntry[] {
  return api.filter((entry) => isScriptEntry(entry) && entry.id !== "setup");
}

function isScriptEntry(entry: ApiEntry): boolean {
  return entry.kind === "function" || entry.kind === "type" || entry.kind === "value";
}
