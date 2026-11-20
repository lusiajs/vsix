import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintLusia } from "../../../editors/vscode/src/logic/lint.ts";

const PARENT = join(import.meta.dir, "../fixtures/lint/Parent.lusia");
const BADGE_IMPORT = '<script>\nimport Badge from "./badge.lusia";\n</script>\n';

function codes(source: string): string[] {
  return lintLusia(source, PARENT).map((issue) => issue.code);
}

describe("lint rules", () => {
  test("unused-import flags a component that is never used as a tag", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<p>hi</p>`, PARENT);
    expect(issues).toEqual([
      {
        line: 2,
        column: 1,
        message: '"Badge" is imported but never used as a tag',
        severity: "warning",
        code: "unused-import",
      },
    ]);
  });

  test("a used component import is not flagged", () => {
    expect(codes(`${BADGE_IMPORT}<Badge label="Done" />`)).toEqual([]);
  });

  test("props-twice flags the second props() call", () => {
    const source =
      '<script>\nimport { props } from "lusia";\nprops({ a: 1 });\nprops({ b: 2 });\n</script>';
    const issues = lintLusia(source, PARENT);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([["props-twice", 4]]);
  });

  test("unknown-prop flags an attribute the child does not declare", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<p>x</p>\n<Badge label="x" size="2" />`, PARENT);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([["unknown-prop", 5]]);
    expect(issues[0]?.message).toContain('"size"');
  });

  test("unknown-prop skips a component whose file cannot be read", () => {
    const source = '<script>\nimport Ghost from "./ghost.lusia";\n</script>\n<Ghost size="2" />';
    expect(codes(source)).toEqual([]);
  });

  test("empty-expression flags {} in markup", () => {
    const issues = lintLusia("<p>{ }</p>", PARENT);
    expect(issues.map((issue) => [issue.code, issue.line, issue.column])).toEqual([
      ["empty-expression", 1, 4],
    ]);
  });

  test("braces in the script are not markup", () => {
    expect(codes("<script>\nconst x = {};\n</script>\n<p>{x}</p>")).toEqual([]);
  });

  test("style-attribute flags an unknown <style> attribute", () => {
    const issues = lintLusia(
      "<style scoped>\n.a {}\n</style>\n<style foo global>\n.b {}\n</style>",
      PARENT,
    );
    expect(issues.map((issue) => issue.code)).toEqual(["style-attribute"]);
    expect(issues[0]?.message).toContain('"foo"');
  });

  test("known <style> attributes pass", () => {
    expect(codes('<style lang="css" scoped>\n.a {}\n</style>')).toEqual([]);
  });

  test("animate-keyframes flags a static animate value", () => {
    const issues = lintLusia('<div animate="fade">x</div>', PARENT);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([
      ["animate-keyframes", "error"],
    ]);
    expect(issues[0]?.message).toBe("animate needs {keyframes}");
  });

  test("animate-keyframes flags a bare animate attribute", () => {
    expect(codes("<div animate>x</div>")).toEqual(["animate-keyframes"]);
  });

  test("an expression animate passes, and the trigger words are not checked", () => {
    expect(
      codes(
        "<div animate={[{ animation: fade, active: ACTIVE.VIEW, once: true }]} duration={300}>x</div>",
      ),
    ).toEqual([]);
  });

  test("animate-key flags a typo of default in keyframes kept in the script", () => {
    const source =
      "<script>\nconst fadeUp = { defaut: [EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };\n</script>\n<div animate={fadeUp}>x</div>";
    const issues = lintLusia(source, PARENT);
    expect(issues).toEqual([
      {
        line: 2,
        column: 18,
        message:
          "unknown keyframes key 'defaut'. Keys are numbers from 0 to 1 or 'default' (did you mean 'default'?)",
        severity: "error",
        code: "animate-key",
      },
    ]);
  });

  test("animate-key flags a typo of an item key", () => {
    expect(codes("<div animate={{ style: fade, durtion: 400 }}>x</div>")).toEqual(["animate-key"]);
  });

  test("animate-keyframes skips a component tag, whose animate is a prop", () => {
    expect(codes(`${BADGE_IMPORT}<Badge animate="x" />`)).not.toContain("animate-keyframes");
  });
});

describe("flow and bind lint rules", () => {
  test("flow-chain flags an ELSE with no IF before it", () => {
    const issues = lintLusia("<p>x</p>\n<ELSE>\n<p>y</p>\n</ELSE>", PARENT);
    expect(issues.map((issue) => [issue.code, issue.severity, issue.line])).toEqual([
      ["flow-chain", "error", 2],
    ]);
    expect(issues[0]?.message).toBe("<ELSE> must come right after </IF> or </ELSEIF>");
  });

  test("flow-chain passes ELSEIF and ELSE right after a branch", () => {
    const source = "<IF {a}>\n</IF>\n<ELSEIF {b}>\n</ELSEIF>\n<ELSE>\n</ELSE>";
    expect(codes(source)).toEqual([]);
  });

  test("flow-chain flags an ELSE after other markup", () => {
    expect(codes("<IF {a}>\n</IF>\n<p>gap</p>\n<ELSE>\n</ELSE>")).toEqual(["flow-chain"]);
  });

  test("bind-target flags bind on a plain tag that is not a form control", () => {
    const issues = lintLusia("<p bind={name}>x</p>", PARENT);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([["bind-target", "error"]]);
    expect(issues[0]?.message).toBe(
      "bind works on input, textarea and select; use bind-<property>",
    );
  });

  test("bind-target passes bind on input, textarea and select", () => {
    expect(
      codes("<input bind={a} /><textarea bind={b}></textarea><select bind={c}></select>"),
    ).toEqual([]);
  });

  test("bind-target passes bind on a component tag, which writes back to the variable", () => {
    expect(codes(`${BADGE_IMPORT}<Badge bind={name} />`)).not.toContain("bind-target");
  });

  test("bind-target flags bind-element on a component tag", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<Badge bind-element={el} />`, PARENT);
    expect(issues.find((issue) => issue.code === "bind-target")?.message).toBe(
      "bind-element works on elements only",
    );
  });

  test("unknown-prop reads bind-<prop> as the prop it binds", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<Badge bind-tone={mode} />`, PARENT);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([]);
  });

  test("bind-target passes bind-value and bind-element on any tag", () => {
    expect(codes("<p bind-element={el} bind-value={x}>y</p>")).toEqual([]);
  });

  test("scroll-numeric-line flags a numeric start or end in a file that uses WHEN.SCROLL", () => {
    const source =
      "<div animate={{ when: WHEN.SCROLL, more: { start: 0.2, end: SCROLL_AT.LEAVE } }}>";
    expect(lintLusia(source, PARENT).map((issue) => [issue.code, issue.column])).toEqual([
      ["scroll-numeric-line", 44],
    ]);
  });

  test("scroll-numeric-line ignores files without WHEN.SCROLL", () => {
    expect(codes("<div animate={{ when: WHEN.VIEW, more: { start: 0.2 } }}>")).not.toContain(
      "scroll-numeric-line",
    );
  });
});
