import * as vscode from "vscode";
import { cssReferences } from "../logic/css.ts";
import { inTsRegion, locationOf, projectOf, tsLocations } from "./common.ts";

export class LusiaReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Location[] | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const locations: vscode.Location[] = [];
    if (inTsRegion(text, offset))
      locations.push(...tsLocations(document, projectOf(document).references(offset)));
    for (const location of cssReferences(text, offset, document.fileName)) {
      locations.push(
        locationOf(
          document,
          location.path ?? document.fileName,
          location.range.start,
          location.range.end,
        ),
      );
    }
    return locations.length > 0 ? locations : undefined;
  }
}
