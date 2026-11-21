import { describe, expect, test } from "bun:test";
import { virtualScript } from "../../src/ts/virtual.ts";

const SOURCE = `<script>
import { variable } from "lusia";
const user = { name: "Ada" };
const count = variable(0);
</script>

<div class="card" title="a {b}">
  <!-- {ignored} -->
  <p>{user.name}</p>
  <p>{count.value} {user.age}</p>
</div>

<style>
.card { display: flex; }
</style>
`;

describe("virtualScript", () => {
  const virtual = virtualScript(SOURCE);

  test("keeps the length and the line breaks of the component", () => {
    expect(virtual.text.length).toBe(SOURCE.length);
    expect(virtual.text.split("\n").length).toBe(SOURCE.split("\n").length);
  });

  test("copies the script as it is", () => {
    expect(virtual.text).toContain('const user = { name: "Ada" };');
    expect(virtual.scriptSpans).toEqual([
      { start: SOURCE.indexOf("<script>") + "<script>".length, end: SOURCE.indexOf("</script>") },
    ]);
  });

  test("blanks the markup and the style", () => {
    expect(virtual.text).not.toContain("card");
    expect(virtual.text).not.toContain("display");
    expect(virtual.text).not.toContain("<p>");
  });

  test("keeps each markup expression as code, at its own offsets", () => {
    expect(virtual.text).toContain("(user.name)");
    expect(virtual.text).toContain("(count.value)");
    expect(virtual.text).toContain("(user.age)");
    expect(virtual.expressionSpans).toContainEqual({
      start: SOURCE.indexOf("user.name"),
      end: SOURCE.indexOf("user.name") + "user.name".length,
    });
  });

  test("ignores quoted attribute values and comments", () => {
    expect(virtual.text).not.toContain("(b)");
    expect(virtual.text).not.toContain("ignored");
  });
});

describe("virtualScript separators", () => {
  test("separates expressions whose gap has blank space", () => {
    expect(virtualScript("<p>{a} {b}</p>").text).toContain(");(");
  });

  test("joins expressions that are back to back so they cannot become a call", () => {
    expect(virtualScript("<p>{a}{b}</p>").text).not.toContain(")(");
    expect(virtualScript("<p>{a}\n{b}</p>").text).not.toContain(")(");
  });
});

describe("virtualScript flow names", () => {
  test("reads the list, item, index and for names", () => {
    const source = [
      "<EACH {rows} as={row} index={position} key={row.id}>",
      "  <span>{row.label}</span>",
      "</EACH>",
      '<EACH {letters} as="{letter}"><i>{letter}</i></EACH>',
      "<FOR {i} from={0} to={10} step={1}>{i}</FOR>",
    ].join("\n");
    expect(virtualScript(source).flowNames).toEqual([
      { name: "row", kind: "item", list: "rows" },
      { name: "position", kind: "index" },
      { name: "letter", kind: "item", list: "letters" },
      { name: "i", kind: "number" },
    ]);
  });
});

describe("virtualScript tolerance", () => {
  test("survives an expression that never closes", () => {
    const source = "<p>{user.name</p><p>{user.age}</p>";
    const virtual = virtualScript(source);
    expect(virtual.text.length).toBe(source.length);
    expect(virtual.text).toContain(";user.name");
    expect(virtual.text).toContain("(user.age)");
    expect(virtual.text).not.toContain("</p>");
  });

  test("survives a self-closing flow tag", () => {
    const source = "<EACH {rows} as={row} />";
    const virtual = virtualScript(source);
    expect(virtual.text.length).toBe(source.length);
    expect(virtual.flowNames).toEqual([{ name: "row", kind: "item", list: "rows" }]);
  });

  test("does not read expressions out of the style section", () => {
    const source = "<style>\n.a { display: flex; }\n</style>";
    const virtual = virtualScript(source);
    expect(virtual.text.length).toBe(source.length);
    expect(virtual.expressionSpans).toEqual([]);
    expect(virtual.text).not.toContain("display");
  });
});
