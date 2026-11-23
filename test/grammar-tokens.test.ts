import { describe, expect, test } from "bun:test";
import { tokenizeLusia, type Token } from "./support/tokenizer.ts";

const SOURCE = [
  "<script>",
  'import { variable } from "lusiajs";',
  'const name = variable("Ada");',
  "const greeting = variable.compute(() => `Hello, ${name.value}!`);",
  "</script>",
  "<p>Derived: {greeting}</p>",
].join("\n");

function tokenOn(lines: Token[][], line: number, text: string): Token | undefined {
  return lines[line]?.find((token) => token.text === text);
}

describe("lusia grammar with the real TypeScript grammar", () => {
  test("=> in a script arrow function is one arrow token", async () => {
    const lines = await tokenizeLusia(SOURCE);
    const arrows = lines[3]?.filter((token) => token.text === "=>") ?? [];
    expect(arrows).toHaveLength(1);
    expect(arrows[0]?.scopes).toContain("storage.type.function.arrow.ts");
  });

  test("the parentheses of the arrow are TypeScript parameter punctuation", async () => {
    const lines = await tokenizeLusia(SOURCE);
    const open = lines[3]?.find(
      (token) =>
        token.text === "(" && token.scopes.includes("punctuation.definition.parameters.begin.ts"),
    );
    expect(open).toBeDefined();
  });

  test("{expr} in markup is an embedded TypeScript expression", async () => {
    const lines = await tokenizeLusia(SOURCE);
    const greeting = tokenOn(lines, 5, "greeting");
    expect(greeting?.scopes).toContain("meta.embedded.block.typescript");
    expect(greeting?.scopes).toContain("variable.other.readwrite.ts");
  });

  test("the animate attribute is a keyword-like attribute name", async () => {
    const lines = await tokenizeLusia("<div animate={fade} duration={400}>x</div>");
    expect(tokenOn(lines, 0, "animate")?.scopes).toContain("keyword.other.animate.lusia");
    expect(tokenOn(lines, 0, "duration")?.scopes).not.toContain("keyword.other.animate.lusia");
  });

  test("the expression of animate is an embedded TypeScript expression", async () => {
    const lines = await tokenizeLusia(
      "<div animate={[{ animation: fade, active: ACTIVE.VIEW }]}>x</div>",
    );
    expect(tokenOn(lines, 0, "fade")?.scopes).toContain("meta.embedded.block.typescript");
  });

  test("the word animate inside quoted text is not an attribute keyword", async () => {
    const lines = await tokenizeLusia('<p class="animate fade">x</p>');
    const keywords =
      lines[0]?.filter((token) => token.scopes.includes("keyword.other.animate.lusia")) ?? [];
    expect(keywords).toEqual([]);
  });
});

describe("flow tags, events and bind-value in the grammar", () => {
  test("IF, ELSEIF, ELSE, EACH and FOR are control keywords", async () => {
    const lines = await tokenizeLusia(
      "<IF {a}>\n</IF>\n<ELSEIF {b}>\n<ELSE>\n<EACH {c}>\n<FOR {n}>\n</FOR>",
    );
    expect(tokenOn(lines, 0, "IF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 1, "IF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 2, "ELSEIF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 3, "ELSE")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 4, "EACH")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 5, "FOR")?.scopes).toContain("keyword.control.flow.lusia");
  });

  test("ELSEIF and ELSE have no closing tag, so markup after them stays HTML", async () => {
    const lines = await tokenizeLusia(
      "<IF {a}>\n<p>A</p>\n<ELSEIF {b}>\n<p>B</p>\n<ELSE>\n<p>C</p>\n</IF>",
    );
    expect(tokenOn(lines, 1, "p")?.scopes).toContain("entity.name.tag.html");
    expect(tokenOn(lines, 3, "p")?.scopes).toContain("entity.name.tag.html");
    expect(tokenOn(lines, 5, "p")?.scopes).toContain("entity.name.tag.html");
    expect(tokenOn(lines, 6, "IF")?.scopes).toContain("keyword.control.flow.lusia");
  });

  test("a nested IF inside a branch and an EACH inside ELSE keep their flow keywords", async () => {
    const lines = await tokenizeLusia(
      "<IF {a}>\n<IF {b}>\n<i>x</i>\n</IF>\n<ELSE>\n<EACH {list} as={item}>\n<li>{item}</li>\n</EACH>\n</IF>",
    );
    expect(tokenOn(lines, 1, "IF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 3, "IF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 5, "EACH")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 7, "EACH")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 8, "IF")?.scopes).toContain("keyword.control.flow.lusia");
    expect(tokenOn(lines, 6, "li")?.scopes).toContain("entity.name.tag.html");
  });

  test("the expression inside a flow tag is TypeScript", async () => {
    const lines = await tokenizeLusia("<IF {ok}>\n</IF>");
    expect(tokenOn(lines, 0, "ok")?.scopes).toContain("meta.embedded.block.typescript");
  });

  test("as, index and key are attribute names on EACH", async () => {
    const lines = await tokenizeLusia("<EACH {todos} as={todo} key={todo.id}>\n</EACH>");
    expect(tokenOn(lines, 0, "as")?.scopes).toContain("entity.other.attribute-name.html");
    expect(tokenOn(lines, 0, "key")?.scopes).toContain("entity.other.attribute-name.html");
  });

  test("an on-attribute with an expression is an event keyword", async () => {
    const lines = await tokenizeLusia("<button onclick={increment}>x</button>");
    expect(tokenOn(lines, 0, "onclick")?.scopes).toContain("keyword.other.event.lusia");
  });

  test("an on:name attribute with an expression is an event keyword", async () => {
    const lines = await tokenizeLusia("<section on:view={showView} on:click-outside={close}>x</section>");
    expect(tokenOn(lines, 0, "on:view")?.scopes).toContain("keyword.other.event.lusia");
    expect(tokenOn(lines, 0, "on:click-outside")?.scopes).toContain("keyword.other.event.lusia");
    expect(tokenOn(lines, 0, "showView")?.scopes).toContain("meta.embedded.block.typescript");
  });

  test("a static on-attribute stays plain HTML", async () => {
    const lines = await tokenizeLusia('<button onclick="go()">x</button>');
    expect(tokenOn(lines, 0, "onclick")?.scopes).not.toContain("keyword.other.event.lusia");
  });

  test("bind-value and bind-prop with an expression are bind keywords", async () => {
    const lines = await tokenizeLusia("<input bind-value={name} bind-checked={other} />");
    expect(tokenOn(lines, 0, "bind-value")?.scopes).toContain("keyword.other.bind.lusia");
    expect(tokenOn(lines, 0, "bind-checked")?.scopes).toContain("keyword.other.bind.lusia");
  });
});
