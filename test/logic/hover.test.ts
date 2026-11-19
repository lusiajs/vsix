import { describe, expect, test } from "bun:test";
import { hoverAt, type HoverResult } from "../../../editors/vscode/src/logic/hover.ts";
import { hoverMarkdown } from "../../../editors/vscode/src/logic/markdown.ts";

const noProps = () => [];

function apiId(result: HoverResult | undefined): string | undefined {
  return result?.kind === "api" ? result.entry.id : undefined;
}

describe("hover", () => {
  test("shows the API entry for a name in the script", () => {
    const text = "<script>\nconst s = store(0);\n</script>";
    expect(apiId(hoverAt(text, text.indexOf("store") + 2, noProps))).toBe("store");
  });

  test("shows the scoped style entry on a style tag", () => {
    const text = "<style scoped>\n.a {}\n</style>";
    expect(apiId(hoverAt(text, text.indexOf("scoped") + 1, noProps))).toBe("style-scoped");
  });

  test("shows the @scoped entry in a style body", () => {
    const text = "<style>\n@scoped { .a {} }\n</style>";
    expect(apiId(hoverAt(text, text.indexOf("@scoped") + 2, noProps))).toBe("scoped");
  });

  test("shows the :global() entry in a style body", () => {
    const text = "<style>\n.a :global(b) {}\n</style>";
    expect(apiId(hoverAt(text, text.indexOf(":global") + 3, noProps))).toBe("inline-global");
  });

  test("shows a component's props with defaults on its tag", () => {
    const text = `<script>\nimport Badge from "./badge.lucia";\n</script>\n<Badge />`;
    const lookup = () => [{ name: "label", defaultValue: '"New"' }];
    const result = hoverAt(text, text.lastIndexOf("Badge") + 1, lookup);
    expect(result).toEqual({ kind: "component", name: "Badge", props: [{ name: "label", defaultValue: '"New"' }] });
    expect(result && hoverMarkdown(result)).toContain('`label` = `"New"`');
  });

  test("shows nothing on plain text", () => {
    const text = "<p>hello</p>";
    expect(hoverAt(text, 4, noProps)).toBeUndefined();
  });

  test("shows the animate entry on the attribute name", () => {
    const text = "<div animate={fade}>x</div>";
    expect(apiId(hoverAt(text, text.indexOf("animate") + 1, noProps))).toBe("animate");
  });

  test("shows the more entry on the more key inside animate", () => {
    const text = "<div animate={{ animation: fade, active: ACTIVE.VIEW, more: { reverse: true } }}>x</div>";
    expect(apiId(hoverAt(text, text.indexOf("more") + 1, noProps))).toBe("animate-more");
  });

  test("shows nothing for the word more outside animate", () => {
    const text = "<p>more</p>";
    expect(hoverAt(text, text.indexOf("more") + 1, noProps)).toBeUndefined();
  });

  test("shows nothing for the word animate in plain text", () => {
    const text = "<p>animate</p>";
    expect(hoverAt(text, 5, noProps)).toBeUndefined();
  });

  test("shows the CSS property under the cursor in a keyframe css object", () => {
    const text = "<div animate={{ animation: { 0: { opacity: 0 }, 1: { opacity: 1 } } }}>x</div>";
    expect(hoverAt(text, text.indexOf("opacity") + 2, noProps)).toEqual({ kind: "css", name: "opacity" });
  });

  test("shows the enum entry for a name in the script", () => {
    const text = '<script>\nimport { EASE } from "lucia";\n</script>';
    expect(apiId(hoverAt(text, text.indexOf("EASE") + 2, noProps))).toBe("ease");
  });

  test("shows the enum entry for a member of a nested group in the script", () => {
    const text = '<script>\nimport { EASE } from "lucia";\nconst s = EASE.STYLE.QUART;\n</script>';
    expect(apiId(hoverAt(text, text.indexOf("QUART") + 2, noProps))).toBe("ease");
  });
});

describe("hover for markup features", () => {
  test("shows the IF entry on the tag name", () => {
    const text = "<IF {ok}>\n<p>x</p>\n</IF>";
    expect(apiId(hoverAt(text, 2, noProps))).toBe("if");
  });

  test("shows the EACH entry on the tag name", () => {
    const text = "<EACH {todos} as={todo}>\n</EACH>";
    expect(apiId(hoverAt(text, 3, noProps))).toBe("each");
  });

  test("shows the ELSE entry on a closing tag name", () => {
    const text = "<IF {ok}>\n</IF>\n<ELSE>\n</ELSE>";
    expect(apiId(hoverAt(text, text.lastIndexOf("ELSE") + 1, noProps))).toBe("else");
  });

  test("shows the event entry on an on-attribute", () => {
    const text = "<button onclick={go}>x</button>";
    expect(apiId(hoverAt(text, text.indexOf("onclick") + 3, noProps))).toBe("event");
  });

  test("shows the bind entry on bind", () => {
    const text = "<input bind={name} />";
    expect(apiId(hoverAt(text, text.indexOf("bind") + 1, noProps))).toBe("bind");
  });

  test("shows the bind-prop entry on a dashed bind attribute", () => {
    const text = "<input bind-value={name} />";
    expect(apiId(hoverAt(text, text.indexOf("value") + 1, noProps))).toBe("bind-prop");
  });

  test("shows the bind-element entry on bind-element", () => {
    const text = "<input bind-element={field} />";
    expect(apiId(hoverAt(text, text.indexOf("element") + 2, noProps))).toBe("bind-element");
  });

  test("shows the PRESET entry in the script", () => {
    const text = '<script>\nimport { PRESET } from "lucia";\n</script>\n<div animate={PRESET.FADE}>x</div>';
    expect(apiId(hoverAt(text, text.indexOf("PRESET") + 2, noProps))).toBe("preset");
  });

  test("shows nothing on an on-word inside plain text", () => {
    const text = "<p>onclick</p>";
    expect(hoverAt(text, 6, noProps)).toBeUndefined();
  });
});
