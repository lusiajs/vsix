import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatLusia } from "../../src/logic/format.ts";
import { realHost } from "../support/real-host.ts";
import {
  expressionEnd,
  protectExpressions,
  restoreExpressions,
} from "lusiajs/language/format/format-expressions.ts";

const SAMPLE = `<style scoped>
.card{padding:1rem}
</style>
<script>
import {variable} from "lusiajs";
const name=variable("Ada");
</script>
<p class="a {name}">Hi {name.value}</p>
<button disabled={name.value === "" || {a:1}.a}>Go</button>
`;

describe("format", () => {
  test("is idempotent", async () => {
    const once = await formatLusia(realHost, SAMPLE);
    expect(await formatLusia(realHost, once)).toBe(once);
  });

  test("keeps every {expr} and turns a whole attribute value into an expression", async () => {
    const output = await formatLusia(realHost, SAMPLE);
    expect(output).toContain("{name.value}");
    expect(output).toContain('disabled={name.value === "" || {a:1}.a}');
    expect(output).toContain('class="a {name}"');
  });

  test("keeps the style attributes", async () => {
    expect(await formatLusia(realHost, SAMPLE)).toContain("<style scoped>");
  });

  test("keeps section order with one blank line between sections", async () => {
    const output = await formatLusia(realHost, SAMPLE);
    const order = ["<style scoped>", "<script>", "<p ", "<button"].map((tag) =>
      output.indexOf(tag),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(output).toContain("</style>\n\n<script>");
    expect(output).toContain("</script>\n\n<p ");
  });

  test("formats the script as TypeScript", async () => {
    expect(await formatLusia(realHost, SAMPLE)).toContain('const name = variable("Ada");');
  });
});

describe("format expressions", () => {
  test("finds the matching brace past nested braces and strings", () => {
    const text = `{ {a: "}"}.a }`;
    expect(expressionEnd(text, 0)).toBe(text.length - 1);
  });

  test("round-trips text that looks like placeholder padding", () => {
    const source = "<p>{a}~~Q</p><b>{b}Q</b>";
    const protectedMarkup = protectExpressions(source);
    expect(restoreExpressions(protectedMarkup.text, protectedMarkup.expressions)).toBe(source);
  });

  test("protects and restores expressions", () => {
    const protectedMarkup = protectExpressions(`<p>{a}</p><b x={b}>{c}</b>`);
    expect(protectedMarkup.expressions).toEqual(["{a}", "{b}", "{c}"]);
    expect(
      restoreExpressions(
        `<p>LUSIAEXPR0X</p><b x="LUSIAEXPR1X">LUSIAEXPR2X</b>`,
        protectedMarkup.expressions,
      ),
    ).toBe(`<p>{a}</p><b x={b}>{c}</b>`);
  });
});

describe("format settings", () => {
  test("uses the editor indentation when no Prettier config sets it", async () => {
    expect(
      await formatLusia(realHost, "<div>\n<p>hi</p>\n</div>", {
        tabSize: 4,
        insertSpaces: true,
      }),
    ).toBe("<div>\n    <p>hi</p>\n</div>\n");
    expect(
      await formatLusia(realHost, "<div>\n<p>hi</p>\n</div>", {
        tabSize: 1,
        insertSpaces: false,
      }),
    ).toBe("<div>\n\t<p>hi</p>\n</div>\n");
  });

  test("a project Prettier config wins over the editor indentation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lusia-format-config-"));
    try {
      writeFileSync(join(dir, ".prettierrc"), JSON.stringify({ tabWidth: 3 }));
      const file = join(dir, "Card.lusia");
      writeFileSync(file, "");
      expect(
        await formatLusia(realHost, "<div>\n<p>hi</p>\n</div>", {
          fileName: file,
          tabSize: 4,
          insertSpaces: true,
        }),
      ).toBe("<div>\n   <p>hi</p>\n</div>\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
    const output = await formatLusia(realHost, FLOW);
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
    const once = await formatLusia(realHost, FLOW);
    expect(await formatLusia(realHost, once)).toBe(once);
  });

  test("indents the content of a paired flow tag", async () => {
    expect(await formatLusia(realHost, `<EACH {todos} as={todo}>\n<li>x</li>\n</EACH>`)).toBe(
      `<EACH {todos} as={todo}>\n  <li>x</li>\n</EACH>\n`,
    );
    expect(await formatLusia(realHost, `<div><IF {a}>\n<span>x</span>\n</IF></div>`)).toBe(
      `<div>\n  <IF {a}>\n    <span>x</span>\n  </IF>\n</div>\n`,
    );
  });

  test("keeps a long expression attribute wrapped like the source", async () => {
    const source = `<ol>
  <li class="row" animate={[
    { style: PRESET.SLIDE_UP, when: WHEN.ATTACH, duration: 300 },
    { style: fadeOut, when: WHEN.DETACH, duration: 200 },
  ]}>
    <span>{task.title}</span>
  </li>
</ol>`;
    const output = await formatLusia(realHost, source);
    expect(output).toContain('<li\n    class="row"\n    animate={[');
    expect(output).toContain("when: WHEN.ATTACH");
    expect(await formatLusia(realHost, output)).toBe(output);
  });

  test("keeps a flow tag inside a paragraph on its line", async () => {
    expect(await formatLusia(realHost, `<p>before <IF {ok}>yes</IF> after</p>`)).toBe(
      `<p>before <IF {ok}>yes</IF> after</p>\n`,
    );
  });

  test("protects a flow tag like an expression", () => {
    const protectedMarkup = protectExpressions("<IF {a > 1}>\n<p>{b}</p>\n</IF>");
    expect(protectedMarkup.expressions).toEqual(["<IF {a > 1}>", "{b}", "</IF>"]);
  });
});
