import * as vscode from "vscode";
import { componentPath } from "../component-file.ts";
import { tagNameAt } from "@language/tag.ts";
import { cssDefinitions } from "../logic/css.ts";
import { inTsRegion, locationOf, projectOf, tsLocations } from "./common.ts";

export class LusiaDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Location[] | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (inTsRegion(text, offset)) {
      const locations = tsLocations(document, projectOf(document).definitions(offset));
      return locations.length > 0 ? locations : undefined;
    }
    const tag = tagNameAt(text, offset);
    const path = tag ? componentPath(document.fileName, text, tag.name) : undefined;
    if (path) return [locationOf(document, path, 0)];
    const style = cssDefinitions(text, offset, document.fileName).map((location) =>
      locationOf(
        document,
        location.path ?? document.fileName,
        location.range.start,
        location.range.end,
      ),
    );
    return style.length > 0 ? style : undefined;
  }
}
