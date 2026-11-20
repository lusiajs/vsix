import { describe, expect, test } from "bun:test";
import { formatLucia } from "../../../editors/vscode/src/logic/format.ts";
import {
  expressionEnd,
  protectExpressions,
  restoreExpressions,
} from "../../../editors/vscode/src/logic/format-expressions.ts";

const SAMPLE = `<style scoped>
.card{padding:1rem}
</style>
<script>
import {variable} from "lucia";
const name=variable("Ada");
</script>
<p class="a {name}">Hi {name.value}</p>
<button disabled={name.value === "" || {a:1}.a}>Go</button>
`;

describe("format", () => {
  test("is idempotent", async () => {
    const once = await formatLucia(SAMPLE);
    expect(await formatLucia(once)).toBe(once);
  });

  test("keeps every {expr} and turns a whole attribute value into an expression", async () => {
    const output = await formatLucia(SAMPLE);
    expect(output).toContain("{name.value}");
    expect(output).toContain('disabled={name.value === "" || {a:1}.a}');
    expect(output).toContain('class="a {name}"');
  });

  test("keeps the style attributes", async () => {
    expect(await formatLucia(SAMPLE)).toContain("<style scoped>");
  });

  test("keeps section order with one blank line between sections", async () => {
    const output = await formatLucia(SAMPLE);
    const order = ["<style scoped>", "<script>", "<p ", "<button"].map((tag) =>
      output.indexOf(tag),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(output).toContain("</style>\n\n<script>");
    expect(output).toContain("</script>\n\n<p ");
  });

  test("formats the script as TypeScript", async () => {
    expect(await formatLucia(SAMPLE)).toContain('const name = variable("Ada");');
  });
});

describe("format expressions", () => {
  test("finds the matching brace past nested braces and strings", () => {
    const text = `{ {a: "}"}.a }`;
    expect(expressionEnd(text, 0)).toBe(text.length - 1);
  });

  test("protects and restores expressions", () => {
    const protectedMarkup = protectExpressions(`<p>{a}</p><b x={b}>{c}</b>`);
    expect(protectedMarkup.expressions).toEqual(["{a}", "{b}", "{c}"]);
    expect(
      restoreExpressions(
        `<p>LUCIAEXPR0X</p><b x="LUCIAEXPR1X">LUCIAEXPR2X</b>`,
        protectedMarkup.expressions,
      ),
    ).toBe(`<p>{a}</p><b x={b}>{c}</b>`);
  });
});

describe("format flow tags", () => {
  const FLOW = `<EACH {todos} as={todo} index={i} key={todo.id}>
<li onclick={() => pick(todo.id)}>{i.value + 1}. {todo.title}</li>
</EACH>
<IF {todos.value.length > 0}>
<p>Some</p>
</IF>
<ELSE>
<p>None</p>
</ELSE>
<FOR {n} from={0} to={3}>
<b>{n}</b>
</FOR>
`;

  test("keeps every flow tag uppercase and its attributes", async () => {
    const output = await formatLucia(FLOW);
    for (const tag of [
      "<EACH {todos} as={todo} index={i} key={todo.id}>",
      "</EACH>",
      "<IF {todos.value.length > 0}>",
      "</IF>",
      "<ELSE>",
      "</ELSE>",
      "<FOR {n} from={0} to={3}>",
      "</FOR>",
    ]) {
      expect(output, tag).toContain(tag);
    }
  });

  test("is idempotent", async () => {
    const once = await formatLucia(FLOW);
    expect(await formatLucia(once)).toBe(once);
  });

  test("protects a flow tag like an expression", () => {
    const protectedMarkup = protectExpressions("<IF {a > 1}>\n<p>{b}</p>\n</IF>");
    expect(protectedMarkup.expressions).toEqual(["<IF {a > 1}>", "{b}", "</IF>"]);
  });
});
