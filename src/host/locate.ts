import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface LocatedPackage {
  packagePath: string | undefined;
  searched: string[];
}

/** Searches upward from `startDir` for `node_modules/<name>/package.json`, stopping at `stopDir`. */
export function locatePackage(
  name: string,
  startDir: string,
  stopDir: string | undefined,
): LocatedPackage {
  const searched: string[] = [];
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, "node_modules", name, "package.json");
    searched.push(candidate);
    if (existsSync(candidate)) return { packagePath: candidate, searched };
    const parent = dirname(dir);
    if (dir === stopDir || parent === dir)
      return { packagePath: undefined, searched };
    dir = parent;
  }
}
