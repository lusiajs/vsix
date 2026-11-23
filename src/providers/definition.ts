import * as vscode from "vscode";
import { componentPath } from "../component-file.ts";
import { cssDefinitions } from "../logic/css.ts";
import { hostFor, type HostSource } from "../host/source.ts";
import { inTsRegion, locationOf, projectOf, tsLocations } from "./common.ts";

export class LusiaDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly hosts: HostSource = hostFor) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Location[] | undefined> {
    const host = await this.hosts(document);
    if (!host) return undefined;
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (inTsRegion(host, text, offset)) {
      const locations = tsLocations(document, projectOf(host, document).definitions(offset));
      return locations.length > 0 ? locations : undefined;
    }
    const tag = host.parseTag.tagNameAt(text, offset);
    const path = tag ? componentPath(host, document.fileName, text, tag.name) : undefined;
    if (path) return [locationOf(document, path, 0)];
    const style = cssDefinitions(host, text, offset, document.fileName).map((location) =>
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
