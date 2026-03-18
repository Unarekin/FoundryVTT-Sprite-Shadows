import { DeepPartial, IsometricFlags, ShadowConfiguration } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TileMixin<t extends typeof foundry.canvas.placeables.Tile>(base: t) {

  return class ShadowedTile extends PlaceableMixin<t>(base) {

    protected getShadowDocument() { return this.document as foundry.documents.TileDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Tile).mesh ?? undefined; }

    protected getIsometricFlags(): IsometricFlags | undefined {
      if (!(game?.modules?.get("isometric-perspective")?.active)) return undefined;

      return this.getShadowDocument().flags["isometric-perspective"] as DeepPartial<IsometricFlags>;
    }

    protected getShadowFlags(): DeepPartial<ShadowConfiguration> {
      const doc = this.getShadowDocument();
      const configSource = doc.getFlag(__MODULE_ID__, "configSource") ?? "tile";

      switch (configSource) {
        case "scene":
          return foundry.utils.deepClone(doc.parent?.flags[__MODULE_ID__] ?? {});
        default:
          return foundry.utils.deepClone(doc.flags[__MODULE_ID__]?.config ?? {});
      }
    }

    protected getSize() {
      const doc = this.getShadowDocument();
      return {
        width: doc.width,
        height: doc.height
      }
    }
  }
}