import { DeepPartial, ShadowConfiguration } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TokenMixin<t extends typeof foundry.canvas.placeables.Token>(base: t) {
  return class ShadowedToken extends PlaceableMixin<t>(base) {
    protected getFlags(): DeepPartial<ShadowConfiguration> { return (this as unknown as foundry.canvas.placeables.Token).actor?.flags[__MODULE_ID__] ?? {} }
    protected getDocument() { return this.document as foundry.documents.TokenDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Token).mesh ?? undefined; }

    protected getAdjustmentMultipliers(): { x: number, y: number, width: number, height: number } {
      const token = (this as unknown as foundry.canvas.placeables.Token);
      return {
        x: token.document.width,
        y: token.document.height,
        width: token.document.width,
        height: token.document.height
      };
    }

    protected getSize() {
      const doc = this.getDocument();
      return {
        width: doc.width * this.scene.grid.size,
        height: doc.height * this.scene.grid.size
      }
    }

  }
}