import { flowDeclarations } from "./flow-declarations.ts";
import { virtualScript } from "./virtual.ts";
import type { TextRange } from "../../../../src/editor/range.ts";

export interface ProjectSource {
  /** The virtual TypeScript file, with the flow declarations after the component. */
  text: string;
  /** The spans of the document whose diagnostics belong to the component. */
  spans: TextRange[];
}

export function projectSource(source: string): ProjectSource {
  const virtual = virtualScript(source);
  return {
    text: `${virtual.text}${flowDeclarations(virtual.flowNames)}`,
    spans: [...virtual.scriptSpans, ...virtual.expressionSpans],
  };
}
