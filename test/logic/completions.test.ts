import { describe, expect, test } from "bun:test";
import { completionsAt } from "../../../editors/vscode/src/logic/completions.ts";

const noProps = () => [];
const BADGE_SCRIPT = `<script>\nimport Badge from "./badge.lucia";\n</script>\n`;

describe("script completions", () => {
  const text = "<script>\n\n</script>";
  const items = completionsAt(text, 9, noProps);
  const labels = items.map((item) => item.label);

  test("offers lucia API names with an auto-import edit", () => {
    const variable = items.find((item) => item.label === "variable");
    expect(variable?.importEdit).toEqual({
      start: 8,
      end: 8,
      text: 'import { variable } from "lucia";\n',
    });
  });

  test("a dotted name is offered, and imports its lucia export", () => {
    const from = items.find((item) => item.label === "variable.compute");
    expect(from?.insertText).toBe("variable.compute");
    expect(from?.importEdit).toEqual({
      start: 8,
      end: 8,
      text: 'import { variable } from "lucia";\n',
    });
  });

  test("offers the props snippet", () => {
    const props = items.find((item) => item.label === "props({ ... })");
    expect(props?.snippet).toBe(true);
    expect(props?.insertText.startsWith("props({")).toBe(true);
  });

  test("does not offer setup, which is not an export", () => {
    expect(labels).not.toContain("setup");
  });
});

describe("markup completions", () => {
  test("offers imported component names after <", () => {
    const text = `${BADGE_SCRIPT}\n<`;
    const badge = completionsAt(text, text.length, noProps).find((item) => item.label === "Badge");
    expect(badge?.insertText).toBe("Badge $1/>");
  });

  test("offers the child's props on its tag", () => {
    const text = `${BADGE_SCRIPT}\n<Badge `;
    const lookup = () => [{ name: "label", defaultValue: '"New"' }];
    const labels = completionsAt(text, text.length, lookup).map((item) => item.label);
    expect(labels).toEqual(["label"]);
  });

  test("offers style attributes on a style tag", () => {
    const text = "<style ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual(["scoped", "global", 'lang="css"']);
  });

  test("offers animate and the events on a plain HTML tag", () => {
    const text = "<p ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual([
      "animate",
      "onclick",
      "oninput",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onfocus",
      "onblur",
      "bind-element",
    ]);
  });

  test("inserts animate with a keyframes expression", () => {
    const text = "<div ";
    const animate = completionsAt(text, text.length, noProps).find(
      (item) => item.label === "animate",
    );
    expect(animate).toMatchObject({ insertText: "animate={$1}", snippet: true, kind: "keyword" });
  });
});

describe("motion completions", () => {
  test("offers the EASE and WHEN enums in the script, with an auto-import edit", () => {
    const text = "<script>\n\n</script>";
    const items = completionsAt(text, 9, noProps);
    const ease = items.find((item) => item.label === "EASE");
    expect(ease).toMatchObject({
      kind: "variable",
      importEdit: { text: 'import { EASE } from "lucia";\n' },
    });
    expect(items.find((item) => item.label === "WHEN")?.kind).toBe("variable");
    expect(items.find((item) => item.label === "CURVE")).toBeUndefined();
  });

  test("completes the curves after EASE.STYLE., with EASE imported", () => {
    const text = "<script>\n\n</script>\n<p>{EASE.STYLE.QU";
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual([
      "LINEAR",
      "QUAD",
      "CUBIC",
      "QUART",
      "QUINT",
      "SINE",
      "EXPO",
      "CIRC",
      "BACK",
      "ELASTIC",
      "BOUNCE",
    ]);
    expect(items[0]?.importEdit?.text).toBe('import { EASE } from "lucia";\n');
  });

  test("completes the members after WHEN. in markup", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ when: WHEN.`;
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "ATTACH",
      "DETACH",
      "VIEW",
      "HOVER",
      "SCROLL",
      "MOVE",
      "RESIZE",
      "MOVE_OR_RESIZE",
      "MANUAL",
    ]);
  });

  test("offers the more keys of VIEW after when: WHEN.VIEW", () => {
    const text = "<div animate={{ when: WHEN.VIEW, more: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "margin",
      "amount",
      "reverse",
    ]);
  });

  test("offers keepSpace after when: WHEN.DETACH", () => {
    const text = "<div animate={{ when: WHEN.DETACH, more: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "keepSpace",
    ]);
  });

  test("offers the HOVER keys after when: WHEN.HOVER, and the SCROLL keys after WHEN.SCROLL", () => {
    const hover = "<div animate={{ when: WHEN.HOVER, more: { ";
    const scroll = "<div animate={{ when: WHEN.SCROLL, more: { ";
    expect(completionsAt(hover, hover.length, noProps).map((item) => item.label)).toEqual([
      "inDelay",
      "outDelay",
      "out",
      "outDuration",
    ]);
    expect(completionsAt(scroll, scroll.length, noProps).map((item) => item.label)).toEqual([
      "start",
      "end",
      "follow",
      "part",
    ]);
  });

  test("completes ENTER, CENTER and LEAVE after SCROLL_AT.", () => {
    const text = "<script>\n\n</script>\nx = SCROLL_AT.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "ENTER",
      "CENTER",
      "LEAVE",
    ]);
  });

  test("completes TOP, CENTER and BOTTOM after EDGE.", () => {
    const text = "<script>\n\n</script>\nx = EDGE.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "TOP",
      "CENTER",
      "BOTTOM",
    ]);
  });

  test("completes STYLE, IN, OUT and INOUT after EASE.", () => {
    const text = "<script>\n\n</script>\nx = EASE.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "STYLE",
      "IN",
      "OUT",
      "INOUT",
    ]);
  });

  test("offers the camelCase style properties inside a keyframe css object", () => {
    const text = "<div animate={{ style: { 0: { ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("opacity");
    expect(labels).toContain("backgroundColor");
    expect(labels).not.toContain("length");
    expect(labels).not.toContain("cssText");
  });

  test("offers the style properties after an ease in a key", () => {
    const text = "<div animate={{ style: { 1: [EASE.OUT, { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toContain(
      "translate",
    );
  });

  test("offers the keyframes default key inside a style object", () => {
    const text = "<div animate={{ style: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "default",
    ]);
  });

  test("offers the item keys inside an animate object", () => {
    const text = "<div animate={[{ ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual([
      "style",
      "when",
      "control",
      "once",
      "more",
      "midway",
      "keep",
      "duration",
      "delay",
      "loop",
      "backAndForth",
    ]);
  });

  test("offers the MIDWAY enum after midway:, and the TURN enum after turn: inside midway", () => {
    const after = "<div animate={{ midway: MIDWAY.";
    expect(completionsAt(after, after.length, noProps).map((item) => item.label)).toEqual([
      "TURN",
      "FINISH",
      "RESTART",
      "SKIP",
      "IGNORE",
    ]);
    const value = "<div animate={{ midway: ";
    expect(completionsAt(value, value.length, noProps).map((item) => item.label)).toEqual([
      "MIDWAY",
    ]);
    const turn = "<div animate={{ midway: { turn: ";
    expect(completionsAt(turn, turn.length, noProps).map((item) => item.label)).toEqual(["TURN"]);
  });

  test("offers the midway keys inside a midway object", () => {
    const text = "<div animate={{ midway: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "play",
      "turn",
      "turnDuration",
      "turnStyle",
      "turnEase",
    ]);
  });

  test("offers the item keys right after the expression brace", () => {
    const text = "<div animate={{ st";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toContain("style");
  });

  test("offers style properties, not item keys, in a keyframes object", () => {
    const text = "<div animate={{ 0: [QUART, IN, { ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("opacity");
    expect(labels).not.toContain("when");
    expect(labels).not.toContain("once");
  });

  test("offers the WHEN enum after when:, with an auto-import edit", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ style: fade, when: `;
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual(["WHEN"]);
    expect(items[0]?.importEdit).toBeDefined();
  });

  test("offers nothing inside an expression that is not an animate object", () => {
    const text = "<div animate={fade}>{ ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).not.toContain(
      "style",
    );
  });
});

describe("style completions", () => {
  test("offers block keywords in a style body", () => {
    const text = "<style>\n  \n</style>";
    const labels = completionsAt(text, 10, noProps).map((item) => item.label);
    expect(labels).toEqual(["@scoped", "@global", ":global()"]);
  });
});

describe("flow and element completions", () => {
  test("offers the flow tags after <, as snippets", () => {
    const text = `${BADGE_SCRIPT}\n<`;
    const flow = completionsAt(text, text.length, noProps).filter(
      (item) => item.kind === "keyword" && item.snippet,
    );
    expect(flow.map((item) => item.label)).toEqual([
      "IF",
      "ELSEIF",
      "ELSE",
      "EACH",
      "FOR",
      "CONTENT",
      "HTML",
    ]);
    expect(flow.find((item) => item.label === "IF")?.insertText).toBe("IF {$1}>\n\t$0\n</IF>");
  });

  test("offers as, index and key inside EACH", () => {
    const text = "<EACH {todos} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "as",
      "index",
      "key",
    ]);
  });

  test("offers from, to and step inside FOR", () => {
    const text = "<FOR {i} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "from",
      "to",
      "step",
    ]);
  });

  test("offers no attributes inside IF", () => {
    const text = "<IF ";
    expect(completionsAt(text, text.length, noProps)).toEqual([]);
  });

  test("offers the events and bind-element on a plain tag", () => {
    const text = "<button ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "animate",
      "onclick",
      "oninput",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onfocus",
      "onblur",
      "bind-element",
    ]);
  });

  test("adds bind and bind-value on form controls", () => {
    const text = "<input ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("bind");
    expect(labels).toContain("bind-value");
    expect(labels).toContain("bind-checked");
  });

  test("the event completion inserts a handler expression", () => {
    const text = "<button ";
    const onclick = completionsAt(text, text.length, noProps).find(
      (item) => item.label === "onclick",
    );
    expect(onclick).toMatchObject({ insertText: "onclick={$1}", snippet: true });
  });
});
