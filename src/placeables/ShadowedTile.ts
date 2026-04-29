import { DeepPartial, IsometricFlags, ShadowConfiguration, ShadowConfigSource } from "types";
import { PlaceableMixin } from "./ShadowedPlaceable";

export function TileMixin<t extends typeof foundry.canvas.placeables.Tile>(base: t) {

  return class ShadowedTile extends PlaceableMixin<t>(base) {

    protected getShadowDocument() { return this.document as foundry.documents.TileDocument; }
    protected getMesh() { return (this as unknown as foundry.canvas.placeables.Tile).mesh ?? undefined; }

    protected getIsometricFlags(): IsometricFlags | undefined {
      if (!(game?.modules?.get("isometric-perspective")?.active)) return undefined;

      return this.getShadowDocument().flags["isometric-perspective"] as IsometricFlags;
    }

    protected getDocumentRotation() { return this.getShadowDocument().rotation; }

    protected getAnchor() {
      const doc = this.getShadowDocument();
      return new PIXI.Point(
        doc.texture.anchorX,
        doc.texture.anchorY
      );
    }

    protected getShadowConfigSource(): ShadowConfigSource {
      const doc = this.getShadowDocument();
      return doc.getFlag(__MODULE_ID__, "configSource") ?? "tile";
    }

    protected getShadowFlags(): DeepPartial<ShadowConfiguration> {
      const doc = this.getShadowDocument();
      const configSource = this.getShadowConfigSource();

      let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;

      switch (configSource) {
        case "scene":
          if (doc.parent?.flags[__MODULE_ID__]) flags = doc.parent.flags[__MODULE_ID__];
          break;
        case "global":
          if (game.settings?.settings.get(`${__MODULE_ID__}.globalConfig`)) flags = game.settings?.get(__MODULE_ID__, "globalConfig");
          break;
        default:
          if (doc.flags[__MODULE_ID__]?.config) flags = doc.flags[__MODULE_ID__].config;
      }

      if (flags) return this.migrateShadowSettings(flags);
      else return {};
    }

    protected positionShadowContainer() {
      const mesh = this.getMesh();
      if (!mesh) return;

      const { width, height } = this.getSize();

      // TODO: Remove when dropping v13 support
      if (game.release?.isNewer("14")) {
        const pos = this.getMeshPosition();
        this.shadowContainer.x = pos.x;
        this.shadowContainer.y = pos.y - (height * mesh.anchor.y);
      } else {
        this.shadowContainer.x = this.x + (width * mesh.anchor.x);
        this.shadowContainer.y = this.y + (height * mesh.anchor.y);
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