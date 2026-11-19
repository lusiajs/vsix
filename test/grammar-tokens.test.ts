import { describe, expect, test } from "bun:test";
import { tokenizeLucia, type Token } from "./support/tokenizer.ts";

const SOURCE = [
  "<script>",
  'import { store } from "lucia";',
  'const name = store("Ada");',
  "const greeting = store.from(() => `Hello, ${name.value}!`);",
  "</script>",
  "<p>Derived: {greeting}</p>",
].join("\n");

function tokenOn(lines: Token[][], line: number, text: string): Token | undefined {
  return lines[line]?.find((token) => token.text === text);
}

describe("lucia grammar with the real TypeScript grammar", () => {
  test("=> in a script arrow function is one arrow token", async () => {
    const lines = await tokenizeLucia(SOURCE);
    const arrows = lines[3]?.filter((token) => token.text === "=>") ?? [];
    expect(arrows).toHaveLength(1);
    expect(arrows[0]?.scopes).toContain("storage.type.function.arrow.ts");
  });

  test("the parentheses of the arrow are TypeScript parameter punctuation", async () => {
    const lines = await tokenizeLucia(SOURCE);
    const open = lines[3]?.find((token) => token.text === "(" && token.scopes.includes("punctuation.definition.parameters.begin.ts"));
    expect(open).toBeDefined();
  });

  test("{expr} in markup is an embedded TypeScript expression", async () => {
    const lines = await tokenizeLucia(SOURCE);
    const greeting = tokenOn(lines, 5, "greeting");
    expect(greeting?.scopes).toContain("meta.embedded.block.typescript");
    expect(greeting?.scopes).toContain("variable.other.readwrite.ts");
  });

  test("the animate attribute is a keyword-like attribute name", async () => {
    const lines = await tokenizeLucia('<div animate={fade} duration={400}>x</div>');
    expect(tokenOn(lines, 0, "animate")?.scopes).toContain("keyword.other.animate.lucia");
    expect(tokenOn(lines, 0, "duration")?.scopes).not.toContain("keyword.other.animate.lucia");
  });

  test("the expression of animate is an embedded TypeScript expression", async () => {
    const lines = await tokenizeLucia('<div animate={[{ animation: fade, active: ACTIVE.VIEW }]}>x</div>');
    expect(tokenOn(lines, 0, "fade")?.scopes).toContain("meta.embedded.block.typescript");
  });

  test("the word animate inside quoted text is not an attribute keyword", async () => {
    const lines = await tokenizeLucia('<p class="animate fade">x</p>');
    const keywords = lines[0]?.filter((token) => token.scopes.includes("keyword.other.animate.lucia")) ?? [];
    expect(keywords).toEqual([]);
  });
});

describe("flow tags, events and bind in the grammar", () => {
  test("IF, ELSEIF, ELSE, EACH and FOR are control keywords in both open and close tags", async () => {
    const lines = await tokenizeLucia("<IF {a}>\n</IF>\n<ELSEIF {b}>\n<ELSE>\n<EACH {c}>\n<FOR {n}>\n</FOR>");
    expect(tokenOn(lines, 0, "IF")?.scopes).toContain("keyword.control.flow.lucia");
    expect(tokenOn(lines, 1, "IF")?.scopes).toContain("keyword.control.flow.lucia");
    expect(tokenOn(lines, 2, "ELSEIF")?.scopes).toContain("keyword.control.flow.lucia");
    expect(tokenOn(lines, 3, "ELSE")?.scopes).toContain("keyword.control.flow.lucia");
    expect(tokenOn(lines, 4, "EACH")?.scopes).toContain("keyword.control.flow.lucia");
    expect(tokenOn(lines, 5, "FOR")?.scopes).toContain("keyword.control.flow.lucia");
  });

  test("the expression inside a flow tag is TypeScript", async () => {
    const lines = await tokenizeLucia("<IF {ok}>\n</IF>");
    expect(tokenOn(lines, 0, "ok")?.scopes).toContain("meta.embedded.block.typescript");
  });

  test("as, index and key are attribute names on EACH", async () => {
    const lines = await tokenizeLucia("<EACH {todos} as={todo} key={todo.id}>\n</EACH>");
    expect(tokenOn(lines, 0, "as")?.scopes).toContain("entity.other.attribute-name.html");
    expect(tokenOn(lines, 0, "key")?.scopes).toContain("entity.other.attribute-name.html");
  });

  test("an on-attribute with an expression is an event keyword", async () => {
    const lines = await tokenizeLucia("<button onclick={increment}>x</button>");
    expect(tokenOn(lines, 0, "onclick")?.scopes).toContain("keyword.other.event.lucia");
  });

  test("a static on-attribute stays plain HTML", async () => {
    const lines = await tokenizeLucia('<button onclick="go()">x</button>');
    expect(tokenOn(lines, 0, "onclick")?.scopes).not.toContain("keyword.other.event.lucia");
  });

  test("bind and bind-prop with an expression are bind keywords", async () => {
    const lines = await tokenizeLucia("<input bind={name} bind-value={other} />");
    expect(tokenOn(lines, 0, "bind")?.scopes).toContain("keyword.other.bind.lucia");
    expect(tokenOn(lines, 0, "bind-value")?.scopes).toContain("keyword.other.bind.lucia");
  });
});
