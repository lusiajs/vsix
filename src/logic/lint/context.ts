import type { PropDef } from "../props.ts";
import { findSections } from "../sections.ts";
import type { LintContext } from "./types.ts";

export function buildContext(source: string, childLookup: (name: string) => PropDef[] | undefined): LintContext {
  const script = findSections(source).find((section) => section.kind === "script");
  const cache = new Map<string, PropDef[] | undefined>();
  return {
    source,
    script: script ? source.slice(script.contentStart, script.contentEnd) : "",
    scriptOffset: script?.contentStart ?? 0,
    markup: blankContent(source),
    childProps(name) {
      if (!cache.has(name)) cache.set(name, childLookup(name));
      return cache.get(name);
    },
  };
}

function blankContent(source: string): string {
  let out = source;
  for (const section of findSections(source).reverse()) {
    const blank = source.slice(section.contentStart, section.contentEnd).replace(/[^\n]/g, " ");
    out = out.slice(0, section.contentStart) + blank + out.slice(section.contentEnd);
  }
  return out;
}
