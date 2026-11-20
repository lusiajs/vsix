// sass-graph ships no type declarations; this is the shape the SCSS index uses.
declare module "sass-graph" {
  export interface SassGraph {
    parseFile(
      filePath: string,
      options?: { loadPaths?: string[]; extensions?: string[] },
    ): { index: Record<string, unknown> };
  }

  export const parseFile: SassGraph["parseFile"];
}
