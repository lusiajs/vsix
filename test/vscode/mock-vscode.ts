import { mock } from "bun:test";
import { createVscode } from "./vscode-stub.ts";

/** One shared `vscode` stub for every test file, since bun keeps module mocks for the whole run. */
export const vscode = createVscode();
mock.module("vscode", () => vscode);
