import type { FlowName } from "./flow-tags.ts";

const ENTITY = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

/** Appended after the source, so offsets stay put. A list may be a variable or a prop. */
export function flowDeclarations(names: FlowName[]): string {
  if (names.length === 0) return "";
  const lines = [
    "type __LusiaValue<T> = T extends { readonly value: infer V } ? V : T;",
    "type __LusiaItem<T> = __LusiaValue<T> extends readonly (infer E)[] ? E : any;",
  ];
  let helper = 0;
  for (const flow of names) {
    if (flow.kind === "number") lines.push(`declare var ${flow.name}: number;`);
    else if (flow.kind === "index")
      lines.push(`declare var ${flow.name}: import("lusiajs").Variable<number>;`);
    else lines.push(...itemDeclaration(flow, () => `__lusiaList${helper++}`));
  }
  return `\n${lines.join("\n")}\n`;
}

function itemDeclaration(flow: FlowName, helperName: () => string): string[] {
  const list = flow.list;
  if (list === undefined) return [`declare var ${flow.name}: any;`];
  if (ENTITY.test(list)) return [`declare var ${flow.name}: __LusiaItem<typeof ${list}>;`];
  const helper = helperName();
  return [`declare var ${flow.name}: __LusiaItem<typeof ${helper}>;`, `const ${helper} = ${list};`];
}
