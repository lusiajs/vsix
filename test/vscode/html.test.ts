import { describe, expect, test } from "bun:test";
import { htmlCompletions, htmlHover } from "../../src/logic/html.ts";
import { realHost } from "../support/real-host.ts";

function labels(text: string, offset: number): string[] {
  return htmlCompletions(realHost, text, offset).map((item) => item.label);
}

function markdownOf(text: string, offset: number) {
  const hover = htmlHover(realHost, text, offset);
  return hover?.kind === "markdown" ? hover : undefined;
}

const COMPONENT = `<script>
import Badge from "./Badge.lusia";
</script>
<Badge `;

describe("htmlCompletions", () => {
  test("offers attributes inside a plain HTML tag", () => {
    expect(labels("<div ", 5)).toContain("class");
    expect(labels("<div ", 5)).toContain("id");
  });

  test("offers element names after <", () => {
    expect(labels("<", 1)).toContain("div");
    expect(labels("<d", 2)).toContain("div");
  });

  test("returns a snippet and a range over the typed word", () => {
    const item = htmlCompletions(realHost, "<div cl", 7).find(
      (entry) => entry.label === "class",
    );
    expect(item).toBeDefined();
    expect(item?.snippet).toBe(true);
    expect(item?.range).toEqual({ start: 5, end: 7 });
    expect(item?.documentation).toContain("class");
  });

  test("stays out of script and style content", () => {
    expect(
      htmlCompletions(realHost, "<script>const x = 1;</script>", 12),
    ).toEqual([]);
    expect(
      htmlCompletions(realHost, "<style>.a { color: red; }</style>", 12),
    ).toEqual([]);
  });

  test("stays out of an expression", () => {
    const text = "<div class={count}>";
    expect(htmlCompletions(realHost, text, text.indexOf("count") + 2)).toEqual(
      [],
    );
  });

  test("leaves tags the shared completion table owns to it", () => {
    expect(htmlCompletions(realHost, COMPONENT, COMPONENT.length)).toEqual([]);
    expect(htmlCompletions(realHost, "<IF ", 4)).toEqual([]);
    expect(htmlCompletions(realHost, "<style ", 7)).toEqual([]);
  });
});

describe("htmlHover", () => {
  const markup = '<div class="x">hello</div>';

  test("describes an attribute", () => {
    const hover = markdownOf(markup, 7);
    expect(hover?.markdown).toContain("class");
    expect(hover?.range).toEqual({ start: 5, end: 10 });
  });

  test("describes an element", () => {
    expect(markdownOf(markup, 2)?.markdown).toContain("div");
  });

  test("returns nothing outside markup or in text between tags", () => {
    expect(
      htmlHover(realHost, "<script>const x = 1;</script>", 12),
    ).toBeUndefined();
    expect(
      htmlHover(realHost, markup, markup.indexOf("hello") + 2),
    ).toBeUndefined();
  });
});
