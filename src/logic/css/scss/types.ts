export type ScssMemberKind = "variable" | "mixin" | "function";

export interface ScssMember {
  /** `$brand` for a variable, `row` for a mixin or function. */
  name: string;
  kind: ScssMemberKind;
  /** The declaration, such as `$brand: #ff0000` or `@mixin row($gap: 1px)`. */
  detail: string;
  /** The namespace it is reached through (`t` in `t.$brand`); global members have none. */
  namespace?: string;
  /** The absolute path of the file that declares it. */
  path: string;
  /** The offset of the name in that file. */
  offset: number;
}

export interface ScssIndex {
  /** The members the style can reach, global or namespaced. */
  members: ScssMember[];
  /** Every file the style pulls in, directly or through `@import`/`@forward`. */
  files: string[];
}
