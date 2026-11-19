import { describe, expect, test } from "bun:test";
import {
  findSections,
  scriptSection,
  sectionAt,
} from "../../../editors/vscode/src/logic/sections.ts";
import { regionAt } from "../../../editors/vscode/src/logic/regions.ts";
import { isTagNameTyping, openTagAt, tagNameAt } from "../../../editors/vscode/src/logic/tag.ts";

const SOURCE = `<script>\nconst a = 1;\n</script>\n<p>{a}</p>\n<style scoped>\n.card { color: red; }\n</style>\n`;

describe("sections", () => {
  test("finds script and style blocks with their attributes", () => {
    const sections = findSections(SOURCE);
    expect(sections.map((section) => section.kind)).toEqual(["script", "style"]);
    expect(sections[1]?.attrs).toBe(" scoped");
    const script = sections[0];
    expect(SOURCE.slice(script?.contentStart, script?.contentEnd)).toBe("\nconst a = 1;\n");
  });

  test("returns the script section", () => {
    expect(scriptSection(SOURCE)?.kind).toBe("script");
  });

  test("skips an unclosed section", () => {
    expect(findSections("<style>\na {}")).toEqual([]);
  });

  test("ignores tags that only start with a section name", () => {
    expect(findSections("<styles>x</styles>")).toEqual([]);
  });

  test("sectionAt finds the block around an offset", () => {
    expect(sectionAt(SOURCE, SOURCE.indexOf(".card"))?.kind).toBe("style");
    expect(sectionAt(SOURCE, SOURCE.indexOf("<p>"))).toBeUndefined();
  });
});

describe("regions", () => {
  test("script content is script", () => {
    expect(regionAt(SOURCE, SOURCE.indexOf("const")).kind).toBe("script");
  });

  test("style content is style", () => {
    expect(regionAt(SOURCE, SOURCE.indexOf(".card")).kind).toBe("style");
  });

  test("markup is markup", () => {
    expect(regionAt(SOURCE, SOURCE.indexOf("<p>")).kind).toBe("markup");
  });

  test("a section's own open tag is markup", () => {
    expect(regionAt(SOURCE, SOURCE.indexOf("scoped")).kind).toBe("markup");
  });
});

describe("open tags", () => {
  test("finds the tag the cursor is inside", () => {
    const text = `<p>hi</p><Badge label="x" `;
    const tag = openTagAt(text, text.length);
    expect(tag?.name).toBe("Badge");
    expect(tag?.nameStart).toBe(10);
    expect(tag?.nameEnd).toBe(15);
  });

  test("a closed tag is not open", () => {
    const text = `<p class="a">hi`;
    expect(openTagAt(text, text.length)).toBeUndefined();
  });

  test("a > inside braces does not close the tag", () => {
    const text = `<p class={a > b}`;
    expect(openTagAt(text, text.length)?.name).toBe("p");
  });

  test("tagNameAt needs the cursor on the name", () => {
    const text = "<Badge />";
    expect(tagNameAt(text, 3)?.name).toBe("Badge");
    expect(tagNameAt(text, 7)).toBeUndefined();
  });

  test("isTagNameTyping is true right after <", () => {
    expect(isTagNameTyping("<p>x <Ba", 8)).toBe(true);
    expect(isTagNameTyping("<p class=", 10)).toBe(false);
  });
});
