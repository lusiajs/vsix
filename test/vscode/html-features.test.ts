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
} from "../../../editors/vscode/src/logic/html.ts";

const PAIR = `<div><span>x</span></div>`;
const MANIFEST = new URL("../../../editors/vscode/package.json", import.meta.url);

describe("htmlTagClose", () => {
  test("closes a plain tag typed by hand", () => {
    expect(htmlTagClose("<div>", 5)).toEqual({ range: { start: 5, end: 5 }, newText: "</div>" });
    expect(htmlTagClose(`<div class={x}>`, 15)?.newText).toBe("</div>");
  });

  test("skips components, flow tags, void tags and section content", () => {
    expect(htmlTagClose("<Badge>", 7)).toBeUndefined();
    expect(htmlTagClose("<IF {x}>", 8)).toBeUndefined();
    expect(htmlTagClose("<img>", 5)).toBeUndefined();
    expect(htmlTagClose("<style></style>", 7)).toBeUndefined();
  });

  test("needs a start tag that ends right at the cursor", () => {
    expect(htmlTagClose("<div>", 4)).toBeUndefined();
    expect(htmlTagClose("<div", 4)).toBeUndefined();
  });
});

describe("htmlRename", () => {
  test("renames the open and close tag", () => {
    expect(htmlRename(PAIR, 7, "section")).toEqual([
      { range: { start: 6, end: 10 }, newText: "section" },
      { range: { start: 14, end: 18 }, newText: "section" },
    ]);
  });

  test("works from the close tag too", () => {
    expect(htmlRename(PAIR, 15, "section")?.map((edit) => edit.range)).toEqual([
      { start: 6, end: 10 },
      { start: 14, end: 18 },
    ]);
  });

  test("reports the tag name range", () => {
    expect(htmlRenameRange(PAIR, 7)).toEqual({ start: 6, end: 10 });
  });

  test("leaves components, flow tags, expressions and style alone", () => {
    expect(htmlRename(`<Badge></Badge>`, 2, "Card")).toBeUndefined();
    expect(htmlRenameRange(`<Badge></Badge>`, 2)).toBeUndefined();
    expect(htmlRenameRange(`<IF {x}></IF>`, 2)).toBeUndefined();
    expect(htmlRenameRange(`<div>{span}</div>`, 7)).toBeUndefined();
    expect(htmlRenameRange(`<style>\n.a {}\n</style>`, 9)).toBeUndefined();
  });
});

describe("htmlLinkedRanges", () => {
  test("pairs the open and close tag", () => {
    expect(htmlLinkedRanges(PAIR, 2)).toEqual([
      { start: 1, end: 4 },
      { start: 21, end: 24 },
    ]);
  });

  test("stays out of expressions and section content", () => {
    expect(htmlLinkedRanges(`<div>{span}</div>`, 6)).toBeUndefined();
    expect(htmlLinkedRanges(`<style>\n.a {}\n</style>`, 9)).toBeUndefined();
  });
});

describe("htmlHighlights", () => {
  test("highlights the open and close tag", () => {
    expect(htmlHighlights(PAIR, 2)).toEqual([
      { range: { start: 1, end: 4 }, kind: "read" },
      { range: { start: 21, end: 24 }, kind: "read" },
    ]);
  });

  test("returns nothing in text between tags", () => {
    expect(htmlHighlights(`<div>x</div>`, 5)).toEqual([]);
  });
});

describe("htmlLinks", () => {
  const markup = `<a href="./page.lusia">page</a><img src="/logo.png"><a href="#top">top</a><a href="https://lusia.dev">site</a>`;

  test("links path attributes", () => {
    expect(
      htmlLinks(markup).map((link) => [
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
    expect(htmlLinks(`<a href={url}>x</a>`)).toEqual([]);
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
    expect(htmlFolding("<div>\n<span>x</span>\n</div>")).toEqual([{ startLine: 0, endLine: 1 }]);
  });
});

describe("htmlSelection", () => {
  test("grows from the tag name to the element to the parent", () => {
    expect(htmlSelection(PAIR, [7])).toEqual([
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
    expect(htmlSelection(PAIR, [])).toEqual([]);
  });
});

describe("htmlDiagnostics", () => {
  test("reports tag close order", async () => {
    const issues = await htmlDiagnostics("<div><span></div>");
    expect(issues.map((issue) => [issue.code, issue.start, issue.end, issue.severity])).toEqual([
      ["close-order", 6, 10, "error"],
      ["close-order", 12, 16, "error"],
    ]);
    expect(issues[0]?.message).toContain("span");
  });

  test("reports a duplicated attribute", async () => {
    const issues = await htmlDiagnostics(`<div class="a" class="b">x</div>`);
    expect(issues.map((issue) => [issue.code, issue.start, issue.end])).toEqual([
      ["no-dup-attr", 15, 20],
    ]);
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
    expect(await htmlDiagnostics(text)).toEqual([]);
  });

  test("reports self-closed plain tags but not Lusia tags", async () => {
    const text = `<script>import Badge from "./Badge.lusia";</script><div /><Badge /><CONTENT />`;
    expect(await htmlDiagnostics(text)).toEqual([
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
    expect(manifest.contributes?.configurationDefaults?.["emmet.includeLanguages"]?.lusia).toBe(
      "html",
    );
  });
});
