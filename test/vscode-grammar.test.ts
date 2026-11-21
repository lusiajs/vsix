import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXTENSION = join(import.meta.dir, "..");
const GRAMMAR_PATH = join(EXTENSION, "syntaxes/lusia.tmLanguage.json");

interface Rule {
  begin?: string;
  end?: string;
  match?: string;
  include?: string;
  patterns?: Rule[];
  repository?: Record<string, Rule>;
  injections?: Record<string, Rule>;
  [key: string]: unknown;
}

const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, "utf8")) as Rule & { scopeName: string };

// Every regex the grammar uses, found anywhere in its tree.
function collectRegexes(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRegexes(item, found);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if ((key === "begin" || key === "end" || key === "match") && typeof value === "string") {
        found.push(value);
      } else {
        collectRegexes(value, found);
      }
    }
  }
  return found;
}

function collectIncludes(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectIncludes(item, found);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "include" && typeof value === "string") found.push(value);
      else collectIncludes(value, found);
    }
  }
  return found;
}

describe("Lusia VS Code grammar", () => {
  test("parses as JSON with the lusia scope name", () => {
    expect(grammar.scopeName).toBe("source.lusia");
    expect(grammar.patterns).toBeArray();
  });

  test("every begin, end and match regex compiles in JavaScript", () => {
    // Oniguruma-only syntax is not used by this grammar, so no conversion is needed.
    const regexes = collectRegexes(grammar);
    expect(regexes.length).toBeGreaterThan(0);
    for (const source of regexes) {
      expect(() => new RegExp(source), source).not.toThrow();
    }
  });

  test("includes the TypeScript, CSS and SCSS grammars for their regions", () => {
    const includes = collectIncludes(grammar);
    expect(includes).toContain("source.ts");
    expect(includes).toContain("source.css");
    expect(includes).toContain("source.css.scss");
    expect(includes).toContain("text.html.basic");
  });

  test("braces are injected into HTML tags so attribute values get expressions", () => {
    expect(Object.keys(grammar.injections ?? {})).toEqual(["L:meta.tag"]);
  });

  test('the style begin rules select CSS for lang="css" and SCSS otherwise', () => {
    const cssBegin = new RegExp(findRepo("style-css").begin!);
    const scssBegin = new RegExp(findRepo("style-scss").begin!);
    expect(cssBegin.test('<style lang="css">')).toBe(true);
    expect(cssBegin.test('<style global lang="css">')).toBe(true);
    expect(cssBegin.test("<style>")).toBe(false);
    expect(scssBegin.test("<style>")).toBe(true);
    expect(scssBegin.test("<style scoped>")).toBe(true);
    expect(scssBegin.test("<styles>")).toBe(false);
  });

  test("the expression rule opens and closes on braces", () => {
    const expression = findRepo("expression");
    expect(new RegExp(expression.begin!).test("{count}")).toBe(true);
    expect(new RegExp(expression.end!).test("}")).toBe(true);
  });

  test("the package manifest points at the grammar and maps embedded regions", () => {
    const manifest = JSON.parse(readFileSync(join(EXTENSION, "package.json"), "utf8"));
    const contribution = manifest.contributes.grammars[0];
    expect(contribution.scopeName).toBe(grammar.scopeName);
    expect(existsSync(join(EXTENSION, contribution.path))).toBe(true);
    expect(Object.keys(contribution.embeddedLanguages)).toEqual([
      "meta.embedded.block.typescript",
      "meta.embedded.block.css",
      "meta.embedded.block.scss",
      "meta.embedded.block.html",
    ]);
  });

  test("> and => in TypeScript regions are not treated as unmatched brackets", () => {
    const manifest = JSON.parse(readFileSync(join(EXTENSION, "package.json"), "utf8"));
    const scopes = manifest.contributes.grammars[0].unbalancedBracketScopes;
    expect(scopes).toContain("keyword.operator.relational");
    expect(scopes).toContain("storage.type.function.arrow");
  });

  test("the > of --> is not a bracket, so bracket colouring cannot mark it red", () => {
    const configuration = JSON.parse(
      readFileSync(join(EXTENSION, "language-configuration.json"), "utf8"),
    );
    expect(configuration.brackets).not.toContainEqual(["<!--", "-->"]);
  });
});

function findRepo(name: string): Rule {
  const repository = (grammar as { repository?: Record<string, Rule> }).repository ?? {};
  const rule = repository[name];
  if (!rule) throw new Error(`missing repository rule ${name}`);
  return rule;
}
