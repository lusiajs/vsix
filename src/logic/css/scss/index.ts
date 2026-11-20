import { dirname } from "node:path";
import { parseFile } from "sass-graph";
import type { IMixin } from "scss-symbols-parser";
import {
  defaultNamespace,
  parseDirectives,
  readScssFile,
  resolveScssModule,
  type ScssDirective,
  type ScssFile,
} from "./parse.ts";
import type { ScssIndex, ScssMember, ScssMemberKind } from "./types.ts";

const MAX_DEPTH = 8;

/** The reachable SCSS members of a style, resolved from its imports on disk. */
export function buildScssIndex(fileName: string | undefined, style: string): ScssIndex {
  const members: ScssMember[] = [];
  const files = new Set<string>();
  if (!fileName) return { members, files: [] };
  for (const directive of parseDirectives(style))
    importDirective(directive, fileName, members, files);
  return { members: dedupe(members), files: [...files] };
}

function importDirective(
  directive: ScssDirective,
  fileName: string,
  members: ScssMember[],
  files: Set<string>,
): void {
  for (const path of directive.paths) {
    const resolved = resolveScssModule(fileName, path.value);
    if (!resolved) continue;
    if (directive.kind === "import") {
      for (const file of importTree(resolved)) {
        members.push(...collectModule(file, files, new Set(), 0));
      }
      continue;
    }
    if (directive.kind !== "use") continue;
    const namespace = directive.global
      ? undefined
      : (directive.namespace ?? defaultNamespace(resolved));
    for (const member of collectModule(resolved, files, new Set(), 0)) {
      members.push(namespace ? { ...member, namespace } : member);
    }
  }
}

function collectModule(
  path: string,
  files: Set<string>,
  stack: Set<string>,
  depth: number,
): ScssMember[] {
  if (depth > MAX_DEPTH || stack.has(path)) return [];
  const file = readScssFile(path);
  if (!file) return [];
  files.add(path);
  stack.add(path);
  const members = fileMembers(file);
  for (const directive of file.directives) {
    if (directive.kind !== "forward") continue;
    for (const forward of directive.paths) {
      const target = resolveScssModule(path, forward.value);
      if (target) members.push(...collectModule(target, files, stack, depth + 1));
    }
  }
  stack.delete(path);
  return members;
}

/** The files an `@import` pulls in, partials and nested imports resolved by sass-graph. */
function importTree(path: string): string[] {
  try {
    const graph = parseFile(path, {
      loadPaths: [dirname(path)],
      extensions: ["scss", "sass"],
    });
    const tree = Object.keys(graph.index);
    return tree.length > 0 ? tree : [path];
  } catch {
    return [path];
  }
}

function fileMembers(file: ScssFile): ScssMember[] {
  return [
    ...file.variables.map((variable) =>
      member(
        file,
        "variable",
        variable.name,
        variable.offset,
        `${variable.name}: ${variable.value}`,
      ),
    ),
    ...file.mixins.map((mixin) =>
      member(
        file,
        "mixin",
        mixin.name,
        nameOffset(file.text, mixin),
        `@mixin ${mixin.name}${parameters(mixin)}`,
      ),
    ),
    ...file.functions.map((fn) =>
      member(
        file,
        "function",
        fn.name,
        nameOffset(file.text, fn),
        `@function ${fn.name}${parameters(fn)}`,
      ),
    ),
  ];
}

function member(
  file: ScssFile,
  kind: ScssMemberKind,
  name: string,
  offset: number,
  detail: string,
): ScssMember {
  return { name, kind, detail, path: file.path, offset };
}

function nameOffset(text: string, entity: IMixin): number {
  return text.indexOf(entity.name, entity.offset);
}

function parameters(entity: IMixin): string {
  const list = entity.parameters.map((parameter) =>
    parameter.value ? `${parameter.name}: ${parameter.value}` : parameter.name,
  );
  return `(${list.join(", ")})`;
}

function dedupe(members: ScssMember[]): ScssMember[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    const key = `${member.namespace ?? ""}:${member.name}:${member.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
