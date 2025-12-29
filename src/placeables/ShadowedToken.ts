import { DeepPartial, IsometricFlags, ShadowConfiguration } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TokenMixin<t extends typeof foundry.canvas.placeables.Token>(base: t) {
  return class ShadowedToken extends PlaceableMixin<t>(base) {
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> {
      const doc = this.document as foundry.documents.TokenDocument;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      if (doc.flags[__MODULE_ID__]?.useTokenOverride) return doc.flags[__MODULE_ID__] ?? {};
      else return (this as unknown as foundry.canvas.placeables.Token).actor?.flags[__MODULE_ID__] ?? {}
    }
    protected getShadowDocument() { return this.document as foundry.documents.TokenDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Token).mesh ?? undefined; }

    protected getIsometricFlags(): IsometricFlags | undefined {
      if (!(game?.modules?.get("isometric-perspective")?.active)) return undefined;
      return this.document.flags["isometric-perspective"] as DeepPartial<IsometricFlags>;
    }

    protected getAnimationDocument(): Actor | undefined { return (this as unknown as foundry.canvas.placeables.Token).document.actor ?? undefined; }

    protected getAdjustmentMultipliers(): { x: number, y: number, width: number, height: number } {
      const token = (this as unknown as foundry.canvas.placeables.Token);
      return {
        x: token.document.width,
        y: token.document.height,
        width: token.document.width,
        height: token.document.height
      };
    }

    protected getMeshPosition(): { x: number, y: number } { 
      const doc = this.document as TokenDocument;
      const mesh = this.getMesh();
      return {
        x: doc.x,
        y: doc.y + (doc.height * this.scene.dimensions.size * (mesh ? mesh.anchor.y : 0.5)) //+ (doc.height * this.scene.dimensions.size * (mesh?.anchor?.y ?? .5)) + this.scene.dimensions.sceneY
      }
    }

    protected getBlobSpriteBounds(): { x: number, y: number, width: number, height: number } {
      const doc = this.document as TokenDocument;
      const mesh = this.getMesh();
      const config = this.shadowConfiguration;
      return {
        x: doc.x + ((doc.width * this.scene.dimensions.size) * (mesh?.anchor.x ?? 1)),
        y: doc.y + ((doc.height * this.scene.dimensions.size) * ((config.alignment === "bottom" && !this.shouldUseIsometric) ? 1 : mesh?.anchor.y ?? .5)),
        width: doc.width * this.scene.dimensions.size,
        height: doc.height * this.scene.dimensions.size
      };
    }



    protected getSize() {
      const doc = this.getShadowDocument();
      return {
        width: doc.width * this.scene.grid.size,
        height: doc.height * this.scene.grid.size
      }
    }

  }
}