import { objectEntries } from "./object-literal.ts";

export interface PropDef {
  name: string;
  defaultValue?: string;
}

const PROPS_CALL = /\bprops\s*\(\s*\{/;
const PROP_ENTRY = /^(?:([A-Za-z_$][\w$]*)|"([^"]+)"|'([^']+)')\s*(?::([\s\S]+))?$/;

/** The keys of the `props({ ... })` call in a component's script, with their default text. */
export function parsePropDefs(source: string): PropDef[] {
  const match = PROPS_CALL.exec(source);
  if (!match) return [];
  const open = match.index + match[0].length - 1;
  return objectEntries(source, open).map(parsePropEntry).filter((prop) => prop !== undefined);
}

function parsePropEntry(entry: string): PropDef | undefined {
  const match = PROP_ENTRY.exec(entry);
  const name = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!name) return undefined;
  const defaultValue = match?.[4]?.trim();
  return defaultValue === undefined ? { name } : { name, defaultValue };
}
