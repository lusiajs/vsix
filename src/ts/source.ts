import type { TextRange } from "lusiajs/editor/range.ts";
import type { LusiaHost } from "../host/types.ts";
import { flowDeclarations } from "./flow-declarations.ts";
import { virtualScript } from "./virtual.ts";

export interface ProjectSource {
  /** The virtual TypeScript file, with the flow declarations after the component. */
  text: string;
  /** The spans of the document whose diagnostics belong to the component. */
  spans: TextRange[];
}

export function projectSource(host: LusiaHost, source: string): ProjectSource {
  const virtual = virtualScript(host, source);
  return {
    text: `${virtual.text}${flowDeclarations(virtual.flowNames)}`,
    spans: [...virtual.scriptSpans, ...virtual.expressionSpans],
  };
}
