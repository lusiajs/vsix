import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  htmlDiagnostics,
  htmlFolding,
  htmlHighlights,
  htmlLinkedRanges,
  htmlLinks,
  htmlRename,
  htmlRenameRange,
  htmlSelection,
  htmlSymbols,
  htmlTagClose,
} from "../../src/logic/html.ts";
import { realHost } from "../support/real-host.ts";

const PAIR = `<div><span>x</span></div>`;
const MANIFEST = new URL("../../package.json", import.meta.url);

describe("htmlTagClose", () => {
  test("closes a plain tag typed by hand", () => {
    expect(htmlTagClose(realHost, "<div>", 5)).toEqual({
      range: { start: 5, end: 5 },
      newText: "</div>",
    });
    expect(htmlTagClose(realHost, `<div class={x}>`, 15)?.newText).toBe(
      "</div>",
    );
  });

  test("skips components, flow tags, void tags and section content", () => {
    expect(htmlTagClose(realHost, "<Badge>", 7)).toBeUndefined();
    expect(htmlTagClose(realHost, "<IF {x}>", 8)).toBeUndefined();
    expect(htmlTagClose(realHost, "<img>", 5)).toBeUndefined();
    expect(htmlTagClose(realHost, "<style></style>", 7)).toBeUndefined();
  });

  test("needs a start tag that ends right at the cursor", () => {
    expect(htmlTagClose(realHost, "<div>", 4)).toBeUndefined();
    expect(htmlTagClose(realHost, "<div", 4)).toBeUndefined();
  });
});

describe("htmlRename", () => {
  test("renames the open and close tag", () => {
    expect(htmlRename(realHost, PAIR, 7, "section")).toEqual([
      { range: { start: 6, end: 10 }, newText: "section" },
      { range: { start: 14, end: 18 }, newText: "section" },
    ]);
  });

  test("works from the close tag too", () => {
    expect(
      htmlRename(realHost, PAIR, 15, "section")?.map((edit) => edit.range),
    ).toEqual([
      { start: 6, end: 10 },
      { start: 14, end: 18 },
    ]);
  });

  test("reports the tag name range", () => {
    expect(htmlRenameRange(realHost, PAIR, 7)).toEqual({ start: 6, end: 10 });
  });

  test("leaves components, flow tags, expressions and style alone", () => {
    expect(htmlRename(realHost, `<Badge></Badge>`, 2, "Card")).toBeUndefined();
    expect(htmlRenameRange(realHost, `<Badge></Badge>`, 2)).toBeUndefined();
    expect(htmlRenameRange(realHost, `<IF {x}></IF>`, 2)).toBeUndefined();
    expect(htmlRenameRange(realHost, `<div>{span}</div>`, 7)).toBeUndefined();
    expect(
      htmlRenameRange(realHost, `<style>\n.a {}\n</style>`, 9),
    ).toBeUndefined();
  });
});

describe("htmlLinkedRanges", () => {
  test("pairs the open and close tag", () => {
    expect(htmlLinkedRanges(realHost, PAIR, 2)).toEqual([
      { start: 1, end: 4 },
      { start: 21, end: 24 },
    ]);
  });

  test("stays out of expressions and section content", () => {
    expect(htmlLinkedRanges(realHost, `<div>{span}</div>`, 6)).toBeUndefined();
    expect(
      htmlLinkedRanges(realHost, `<style>\n.a {}\n</style>`, 9),
    ).toBeUndefined();
  });
});

describe("htmlHighlights", () => {
  test("highlights the open and close tag", () => {
    expect(htmlHighlights(realHost, PAIR, 2)).toEqual([
      { range: { start: 1, end: 4 }, kind: "read" },
      { range: { start: 21, end: 24 }, kind: "read" },
    ]);
  });

  test("returns nothing in text between tags", () => {
    expect(htmlHighlights(realHost, `<div>x</div>`, 5)).toEqual([]);
  });
});

describe("htmlLinks", () => {
  const markup = `<a href="./page.lusia">page</a><img src="/logo.png"><a href="#top">top</a><a href="https://lusia.dev">site</a>`;

  test("links path attributes", () => {
    expect(
      htmlLinks(realHost, markup).map((link) => [
        markup.slice(link.range.start, link.range.end),
        link.target,
      ]),
    ).toEqual([
      ["./page.lusia", "./page.lusia"],
      ["/logo.png", "/logo.png"],
      ["#top", "#top"],
      ["https://lusia.dev", "https://lusia.dev"],
    ]);
  });

  test("skips expression values", () => {
    expect(htmlLinks(realHost, `<a href={url}>x</a>`)).toEqual([]);
  });
});

describe("htmlSymbols", () => {
  test("outlines the nested elements", () => {
    expect(htmlSymbols(PAIR)).toEqual([
      {
        name: "div",
        kind: 8,
        range: { start: 0, end: 25 },
        selectionRange: { start: 0, end: 25 },
        children: [
          {
            name: "span",
            kind: 8,
            range: { start: 5, end: 19 },
            selectionRange: { start: 5, end: 19 },
            children: [],
          },
        ],
      },
    ]);
  });
});

describe("htmlFolding", () => {
  test("folds an element to its content", () => {
    expect(htmlFolding("<div>\n<span>x</span>\n</div>")).toEqual([
      { startLine: 0, endLine: 1 },
    ]);
  });
});

describe("htmlSelection", () => {
  test("grows from the tag name to the element to the parent", () => {
    expect(htmlSelection(realHost, PAIR, [7])).toEqual([
      {
        range: { start: 6, end: 10 },
        parent: {
          range: { start: 5, end: 19 },
          parent: { range: { start: 0, end: 25 } },
        },
      },
    ]);
  });

  test("returns nothing for no offsets", () => {
    expect(htmlSelection(realHost, PAIR, [])).toEqual([]);
  });
});

describe("htmlDiagnostics", () => {
  test("reports tag close order", async () => {
    const issues = await htmlDiagnostics(realHost, "<div><span></div>");
    expect(
      issues.map((issue) => [
        issue.code,
        issue.start,
        issue.end,
        issue.severity,
      ]),
    ).toEqual([
      ["close-order", 6, 10, "error"],
      ["close-order", 12, 16, "error"],
    ]);
    expect(issues[0]?.message).toContain("span");
  });

  test("reports a duplicated attribute", async () => {
    const issues = await htmlDiagnostics(
      realHost,
      `<div class="a" class="b">x</div>`,
    );
    expect(issues.map((issue) => [issue.code, issue.start, issue.end])).toEqual(
      [["no-dup-attr", 15, 20]],
    );
  });

  test("accepts components, flow tags, expressions and scoped style", async () => {
    const text = `<script>
import Badge from "./Badge.lusia";
const view = { count: 1 };
</script>
<Badge label={count} />
<IF {count > 0}><span>{count}</span></IF>
<div class={count > 1 ? "big" : "small"}>text</div>
<style>
@scoped {
  .note { color: red; }
}
</style>`;
    expect(await htmlDiagnostics(realHost, text)).toEqual([]);
  });

  test("accepts ELSE and ELSEIF branches inside an IF", async () => {
    const text =
      "<li>\n<IF {a}>\n<b>x</b>\n<ELSEIF {b}>\n<i>y</i>\n<ELSE>\n<span>z</span>\n</IF>\n</li>";
    expect(await htmlDiagnostics(realHost, text)).toEqual([]);
  });

  test("reports self-closed plain tags but not Lusia tags", async () => {
    const text = `<script>import Badge from "./Badge.lusia";</script><div /><Badge /><CONTENT />`;
    expect(await htmlDiagnostics(realHost, text)).toEqual([
      {
        start: 56,
        end: 58,
        message: "<div> must not be self-closed",
        severity: "error",
        code: "no-self-closing",
      },
    ]);
  });
});

describe("Emmet", () => {
  test("the manifest maps lusia to the html syntax", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      contributes?: {
        configurationDefaults?: Record<string, Record<string, string>>;
      };
    };
    expect(
      manifest.contributes?.configurationDefaults?.["emmet.includeLanguages"]
        ?.lusia,
    ).toBe("html");
  });
});
