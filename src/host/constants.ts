// The old name is a fallback for projects that have not moved to the new package yet.
export const TOOLS_PACKAGES = [
  "@lusiajs/vscode-support",
  "@lusiajs/language-tools",
] as const;
export const TOOLS_PACKAGE = TOOLS_PACKAGES[0];
export const TOOLS_ENTRY = "./vscode";
export const TOOLS_FALLBACK_FILE = "dist/vscode.js";
export const LUSIA_PACKAGE = "lusiajs";
export const SUPPORTED_API_VERSION = 1;
