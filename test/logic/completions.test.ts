import { describe, expect, test } from "bun:test";
import { completionsAt } from "../../../editors/vscode/src/logic/completions.ts";

const noProps = () => [];
const BADGE_SCRIPT = `<script>\nimport Badge from "./badge.lucia";\n</script>\n`;

describe("script completions", () => {
  const text = "<script>\n\n</script>";
  const items = completionsAt(text, 9, noProps);
  const labels = items.map((item) => item.label);

  test("offers lucia API names with an auto-import edit", () => {
    const store = items.find((item) => item.label === "store");
    expect(store?.importEdit).toEqual({ start: 8, end: 8, text: 'import { store } from "lucia";\n' });
  });

  test("a dotted name is offered, and imports its lucia export", () => {
    const from = items.find((item) => item.label === "store.from");
    expect(from?.insertText).toBe("store.from");
    expect(from?.importEdit).toEqual({ start: 8, end: 8, text: 'import { store } from "lucia";\n' });
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
    expect(labels).toEqual(["animate", "onclick", "oninput", "onchange", "onsubmit", "onkeydown", "onfocus", "onblur", "bind-element"]);
  });

  test("inserts animate with a keyframes expression", () => {
    const text = "<div ";
    const animate = completionsAt(text, text.length, noProps).find((item) => item.label === "animate");
    expect(animate).toMatchObject({ insertText: "animate={$1}", snippet: true, kind: "keyword" });
  });
});

describe("motion completions", () => {
  test("offers the TRANSITION, EASE and ACTIVE enums in the script, with an auto-import edit", () => {
    const text = "<script>\n\n</script>";
    const items = completionsAt(text, 9, noProps);
    const transition = items.find((item) => item.label === "TRANSITION");
    expect(transition).toMatchObject({ kind: "variable", importEdit: { text: 'import { TRANSITION } from "lucia";\n' } });
    expect(items.find((item) => item.label === "EASE")?.kind).toBe("variable");
    expect(items.find((item) => item.label === "ACTIVE")?.kind).toBe("variable");
  });

  test("completes the members after TRANSITION., with the enum imported", () => {
    const text = "<script>\n\n</script>\n<p>{TRANSITION.QU";
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual([
      "LINEAR", "QUAD", "CUBIC", "QUART", "QUINT", "SINE", "EXPO", "CIRC", "BACK", "ELASTIC", "BOUNCE",
    ]);
    expect(items[0]?.importEdit?.text).toBe('import { TRANSITION } from "lucia";\n');
  });

  test("completes the members after ACTIVE. in markup", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ active: ACTIVE.`;
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["IN", "OUT", "VIEW", "HOVER", "SCROLL", "MANUAL"]);
  });

  test("offers the more keys of VIEW after active: ACTIVE.VIEW", () => {
    const text = "<div animate={{ active: ACTIVE.VIEW, more: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["margin", "amount", "reverse"]);
  });

  test("offers the HOVER keys after active: ACTIVE.HOVER, and the SCROLL keys after ACTIVE.SCROLL", () => {
    const hover = "<div animate={{ active: ACTIVE.HOVER, more: { ";
    const scroll = "<div animate={{ active: ACTIVE.SCROLL, more: { ";
    expect(completionsAt(hover, hover.length, noProps).map((item) => item.label)).toEqual(["inDelay", "outDelay", "out", "outDuration"]);
    expect(completionsAt(scroll, scroll.length, noProps).map((item) => item.label)).toEqual(["start", "end", "follow", "part"]);
  });

  test("completes the members of EASE after EASE.", () => {
    const text = "<script>\n\n</script>\nx = EASE.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["IN", "OUT", "INOUT"]);
  });

  test("offers the item keys inside an animate object", () => {
    const text = "<div animate={[{ ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual(["animation", "active", "control", "once", "more", "keep", "duration", "delay", "loop", "backAndForth"]);
  });

  test("offers the item keys right after the expression brace", () => {
    const text = "<div animate={{ an";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toContain("animation");
  });

  test("offers no item keys in a keyframes object", () => {
    const text = "<div animate={{ 0: [QUART, IN, { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).not.toContain("animation");
  });

  test("offers the ACTIVE enum after active:, with an auto-import edit", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ animation: fade, active: `;
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual(["ACTIVE"]);
    expect(items[0]?.importEdit).toBeDefined();
  });

  test("offers nothing inside an expression that is not an animate object", () => {
    const text = "<div animate={fade}>{ ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).not.toContain("animation");
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
    const flow = completionsAt(text, text.length, noProps).filter((item) => item.kind === "keyword" && item.snippet);
    expect(flow.map((item) => item.label)).toEqual(["IF", "ELSEIF", "ELSE", "EACH", "FOR"]);
    expect(flow.find((item) => item.label === "IF")?.insertText).toBe("IF {$1}>\n\t$0\n</IF>");
  });

  test("offers as, index and key inside EACH", () => {
    const text = "<EACH {todos} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["as", "index", "key"]);
  });

  test("offers from, to and step inside FOR", () => {
    const text = "<FOR {i} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["from", "to", "step"]);
  });

  test("offers no attributes inside IF", () => {
    const text = "<IF ";
    expect(completionsAt(text, text.length, noProps)).toEqual([]);
  });

  test("offers the events and bind-element on a plain tag", () => {
    const text = "<button ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "animate", "onclick", "oninput", "onchange", "onsubmit", "onkeydown", "onfocus", "onblur", "bind-element",
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
    const onclick = completionsAt(text, text.length, noProps).find((item) => item.label === "onclick");
    expect(onclick).toMatchObject({ insertText: "onclick={$1}", snippet: true });
  });
});
