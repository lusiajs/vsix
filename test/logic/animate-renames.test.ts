import { describe, expect, test } from "bun:test";
import { animateRenameFix, isRenameMessage } from "../../src/logic/animate-renames.ts";

function fixIn(text: string) {
  return animateRenameFix(text, 0, text.length);
}

describe("animate rename fix", () => {
  test.each([
    ["style: { opacity: 0 }", "style", "play"],
    ["when: ACTIVE.VIEW", "when", "on"],
    ["more: { reverse: true }", "more", "options"],
    ["{ default: [EASE.IN] }", "default", "ease"],
    ["WHEN.SCROLL", "WHEN", "ON"],
    ["MIDWAY.FINISH", "MIDWAY.FINISH", "MIDWAY.WAIT"],
    ["MIDWAY.SKIP", "MIDWAY.SKIP", "MIDWAY.JUMP_TO_END"],
    ["MIDWAY.IGNORE", "MIDWAY.IGNORE", "MIDWAY.KEEP_CURRENT"],
    ["MIDWAY.TURN", "MIDWAY.TURN", "MIDWAY.SWITCH"],
  ])("renames %s", (text, from, to) => {
    const fix = fixIn(text);
    expect(fix?.text).toBe(to);
    expect(text.slice(fix?.start, fix?.end)).toBe(from);
  });

  test("keeps the key colon and the spacing around it", () => {
    const text = "style  : x";
    expect(fixIn(text)).toEqual({ start: 0, end: 5, text: "play" });
  });

  test("ignores a word that is not followed by a colon", () => {
    expect(fixIn("const style = 1")).toBeUndefined();
    expect(fixIn("MIDWAY.WAIT")).toBeUndefined();
  });

  test("only looks inside the given range", () => {
    const text = "when: a\nstyle: b";
    const start = text.indexOf("\n") + 1;
    expect(animateRenameFix(text, start, text.length)).toEqual({
      start,
      end: start + 5,
      text: "play",
    });
  });

  test("recognises rename messages", () => {
    expect(isRenameMessage("'style' was renamed to 'play'.")).toBe(true);
    expect(isRenameMessage("Unexpected token")).toBe(false);
  });
});
