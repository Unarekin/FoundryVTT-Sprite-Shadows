import { DeepPartial, ShadowConfiguration } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TileMixin<t extends typeof foundry.canvas.placeables.Tile>(base: t) {

  return class ShadowedTile extends PlaceableMixin<t>(base) {
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> { return this.getShadowDocument().flags[__MODULE_ID__] as DeepPartial<ShadowConfiguration>; }
    protected getShadowDocument() { return this.document as foundry.documents.TileDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Tile).mesh ?? undefined; }

    protected getSize() {
      const doc = this.getShadowDocument();
      return {
        width: doc.width,
        height: doc.height
      }
    }
  }
}