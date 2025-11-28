import { DeepPartial, ShadowConfiguration } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TileMixin<t extends typeof foundry.canvas.placeables.Tile>(base: t) {

  return class ShadowedTile extends PlaceableMixin<t>(base) {
    protected getFlags(): DeepPartial<ShadowConfiguration> { return this.getDocument().flags[__MODULE_ID__] as DeepPartial<ShadowConfiguration>; }
    protected getDocument() { return this.document as foundry.documents.TileDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Tile).mesh ?? undefined; }
    protected getSize() {
      const doc = this.getDocument();
      return {
        width: doc.width * this.scene.grid.size,
        height: doc.height * this.scene.grid.size
      }
    }
  }
}