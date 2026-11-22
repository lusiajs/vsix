import { describe, expect, test } from "bun:test";
import { cssCompletions, cssHover } from "../../src/logic/css.ts";
import { realHost } from "../support/real-host.ts";

/** The source without its `|` cursor marker, plus the offset that marker had. */
function marked(source: string): { text: string; offset: number } {
  const offset = source.indexOf("|");
  return { text: source.slice(0, offset) + source.slice(offset + 1), offset };
}

function labels(text: string, offset: number): string[] {
  return cssCompletions(realHost, text, offset).map((item) => item.label);
}

describe("css completions", () => {
  test("offers properties inside a style block", () => {
    const { text, offset } = marked("<style>\n.a { dis|\n}\n</style>");
    const display = cssCompletions(realHost, text, offset).find((item) => item.label === "display");
    expect(display?.kind).toBe("property");
    expect(display?.insertText).toContain("display");
    expect(display?.snippet).toBe(true);
  });

  test("offers values after a property's colon", () => {
    const { text, offset } = marked("<style>\n.a { color: | }\n</style>");
    expect(labels(text, offset)).toContain("red");
  });

  test("offers properties in nested SCSS", () => {
    const { text, offset } = marked("<style>\n.a { .b { dis| } }\n</style>");
    expect(labels(text, offset)).toContain("display");
  });

  test("offers properties when the style tag sets lang to css", () => {
    const double = marked('<style lang="css">\n.a { dis|\n}\n</style>');
    expect(labels(double.text, double.offset)).toContain("display");
    const single = marked("<style lang = 'css'>\n.a { dis|\n}\n</style>");
    expect(labels(single.text, single.offset)).toContain("display");
  });

  test("offers nothing outside a style block", () => {
    const markup = marked("<p>dis|play</p>");
    expect(cssCompletions(realHost, markup.text, markup.offset)).toEqual([]);
    const script = marked("<script>\nconst display| = 1;\n</script>");
    expect(cssCompletions(realHost, script.text, script.offset)).toEqual([]);
  });

  test("shifts a completion range by the style content start", () => {
    const { text, offset } = marked("<style>\n.a { dis|\n}\n</style>");
    const display = cssCompletions(realHost, text, offset).find((item) => item.label === "display");
    const start = text.indexOf("dis");
    expect(display?.range).toEqual({ start, end: start + 3 });
  });
});

describe("css hover", () => {
  test("shows the property documentation as markdown", () => {
    const { text, offset } = marked("<style>\n.a {\n  display|: block;\n}\n</style>");
    const hover = cssHover(realHost, text, offset);
    expect(hover?.kind).toBe("markdown");
    if (hover?.kind !== "markdown") return;
    expect(hover.markdown).toContain("display");
    const range = hover.range;
    expect(range?.start).toBe(text.indexOf("display"));
    expect(range && text.slice(range.start, range.end)).toContain("display");
  });

  test("shows nothing in markup", () => {
    const markup = marked("<p>dis|play</p>");
    expect(cssHover(realHost, markup.text, markup.offset)).toBeUndefined();
  });
});
