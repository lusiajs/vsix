import { afterAll, describe, expect, test } from "bun:test";
import { loadTypeScript } from "../../src/ts/load.ts";
import type { TsEdit } from "../../src/ts/types.ts";
import { after, createWorkspace } from "./ts-workspace.ts";

const UTIL = `/** Greets a person by name. */
export function greet(name: string): { text: string; length: number } {
  return { text: \`Hello \${name}\`, length: name.length };
}
`;

const BADGE = `<script>
import { props } from "lusiajs";
const { label, size } = props({ label: "New", size: 1 });
</script>
<span>{label.value}</span>
`;

const workspace = createWorkspace({ "util.ts": UTIL });

afterAll(() => workspace.dispose());

describe("ts project", () => {
  test("loads the workspace TypeScript", () => {
    const ts = loadTypeScript(workspace.root);
    expect(ts === undefined).toBe(false);
    expect(typeof ts?.createLanguageService).toBe("function");
  });

  test("infers script types and members", () => {
    const source = `<script>
import { variable } from "lusiajs";
const count = variable(0);
const user = { name: "Ada", age: 36 };
</script>
<p>{count.value}</p>
<p>{user.name}</p>
`;
    const project = workspace.open("Types.lusia", source);
    expect(project.hover(source.indexOf("count =") + 1)?.markdown).toContain("Variable<number>");
    expect(project.completions(after(source, "count.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["value", "get", "set", "peek"]),
    );
    expect(project.completions(after(source, "user.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["name", "age"]),
    );
    expect(project.hover(source.indexOf("user =") + 1)?.markdown).toContain("name: string");
  });

  test("reads the imported function type, definition, references and rename", () => {
    const source = `<script>
import { greet } from "./util.ts";
const hello = greet("Ada");
</script>
<p>{hello.text}</p>
`;
    const project = workspace.open("Functions.lusia", source);
    expect(project.hover(source.indexOf("hello =") + 1)?.markdown).toContain("text: string");

    const call = after(source, "const hello = ");
    const definition = project.definitions(call)[0];
    expect(definition?.fileName.endsWith("util.ts")).toBe(true);
    expect(definition === undefined ? "" : UTIL.slice(definition.start, definition.start + 5)).toBe(
      "greet",
    );

    const references = project.references(call);
    expect(references.some((location) => location.fileName.endsWith("util.ts"))).toBe(true);
    expect(
      references.some(
        (location) =>
          location.fileName === project.fileName && location.start === source.indexOf("greet"),
      ),
    ).toBe(true);

    const edits = project.rename(call, "welcome");
    const renamed = applyEdits(source, project.fileName, edits);
    expect(renamed).toContain('import { welcome } from "./util.ts"');
    expect(renamed).toContain('welcome("Ada")');
    expect(edits.find((edit) => edit.fileName.endsWith("util.ts"))?.text).toBe("welcome");
  });

  test("helps with the arguments of an imported function", () => {
    const source = `<script>
import { greet } from "./util.ts";
const hello = greet("Ada");
</script>
`;
    const project = workspace.open("Arguments.lusia", source);
    const help = project.signatureHelp(after(source, "greet("));
    expect(help?.label).toContain("greet(name: string)");
    expect(help?.documentation).toContain("Greets a person by name.");
    expect(help?.parameters[0]?.label).toBe("name: string");
    expect(help?.activeParameter).toBe(0);
  });

  test("maps a wrong type error back onto the script", () => {
    const source = `<script>
const total: number = "many";
</script>
`;
    const project = workspace.open("Wrong.lusia", source);
    const issues = project.diagnostics();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe(2322);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("not assignable");
    expect(source.slice(issues[0]?.start, issues[0]?.end)).toBe("total");
  });

  test("hovers and completes markup expressions", () => {
    const source = `<script>
import { greet } from "./util.ts";
const user = { name: "Ada", age: 36 };
const hello = greet(user.name);
</script>
<p>{user.name}</p>
<p>{hello.text}</p>
`;
    const project = workspace.open("Expressions.lusia", source);
    const propertyStart = after(source, "{user.");
    const userHover = project.hover(propertyStart);
    expect(userHover?.markdown).toContain("name: string");
    expect(userHover?.range).toEqual({ start: propertyStart, end: propertyStart + "name".length });
    expect(project.hover(after(source, "{hello."))?.markdown).toContain("text: string");
    expect(project.completions(after(source, "{user.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["name", "age"]),
    );
    expect(project.completionDetails(after(source, "{hello."), "text")?.detail).toContain(
      "text: string",
    );
  });

  test("resolves a component import and reads its props type", () => {
    workspace.write("Badge.lusia", BADGE);
    const source = `<script>
import Badge from "./Badge.lusia";
const options: typeof Badge.props = { label: "x", size: 2 };
const wrong: typeof Badge.props = { label: 1 };
</script>
<Badge label="x" />
`;
    const project = workspace.open("Parent.lusia", source);
    const issues = project.diagnostics();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("not assignable to type 'string'");
    expect(project.hover(source.indexOf("Badge"))?.markdown).toContain("LusiaProps");
    expect(project.definitions(source.indexOf("Badge"))[0]?.fileName.endsWith("Badge.lusia")).toBe(
      true,
    );
  });

  test("resolves a component that declares no props", () => {
    workspace.write(
      "Plain.lusia",
      `<script>\nconst label = "plain";\n</script>\n<span>{label}</span>\n`,
    );
    const source = `<script>
import Plain from "./Plain.lusia";
const props: typeof Plain.props = {};
</script>
<Plain />
`;
    const project = workspace.open("PlainParent.lusia", source);
    expect(project.diagnostics()).toEqual([]);
    expect(project.hover(source.indexOf("Plain"))?.markdown).toContain("LusiaProps");
  });

  test("infers EACH items, indexes and FOR counters", () => {
    const source = `<script>
import { variable } from "lusiajs";
interface Row { label: string; count: number }
const rows = variable<Row[]>([{ label: "a", count: 1 }]);
</script>
<EACH {rows} as={row} index={i}>
  <span>{row.label}</span>
  <span>{i.value}</span>
</EACH>
<FOR {n} to={3}><span>{n.toFixed(1)}</span></FOR>
`;
    const project = workspace.open("Flow.lusia", source);
    expect(project.hover(after(source, "{row."))?.markdown).toContain("label: string");
    expect(project.completions(after(source, "{row.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["label", "count"]),
    );
    expect(project.hover(after(source, "{i."))?.markdown).toContain("value: number");
    expect(project.completions(after(source, "{i.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["value", "get", "set"]),
    );
    expect(project.hover(source.indexOf("{n.toFixed") + 1)?.markdown).toContain("number");
    expect(project.completions(after(source, "{n.")).map((item) => item.name)).toContain("toFixed");
  });

  test("tolerates an unclosed expression", () => {
    const source = `<script>
const user = { name: "Ada", age: 36 };
</script>
<p>{user.name</p>
`;
    const project = workspace.open("Broken.lusia", source);
    expect(project.diagnostics()).toEqual([]);
    expect(project.completions(after(source, "{user.")).map((item) => item.name)).toEqual(
      expect.arrayContaining(["name", "age"]),
    );
    expect(project.hover(after(source, "{user."))?.markdown).toContain("name: string");
  });

  test("updates a project in place", () => {
    const project = workspace.open("Update.lusia", `<script>\nconst value = 1;\n</script>\n`);
    expect(project.diagnostics()).toEqual([]);
    const source = `<script>\nconst value: string = "x";\n</script>\n<p>{value.length}</p>\n`;
    project.update(source);
    expect(project.diagnostics()).toEqual([]);
    expect(project.hover(after(source, "{value."))?.markdown).toContain("length: number");
  });
});

function applyEdits(source: string, fileName: string, edits: TsEdit[]): string {
  let result = source;
  for (const edit of edits
    .filter((candidate) => candidate.fileName === fileName)
    .sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
  }
  return result;
}
