import * as vscode from "vscode";
import { cssReferences } from "../logic/css.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { inTsRegion, locationOf, projectOf, tsLocations } from "./common.ts";

export class LusiaReferenceProvider implements vscode.ReferenceProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Location[] | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    const offset = document.offsetAt(position);
    const locations: vscode.Location[] = [];
    if (inTsRegion(host, text, offset))
      locations.push(...tsLocations(document, projectOf(host, document).references(offset)));
    for (const location of cssReferences(host, text, offset, document.fileName)) {
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
