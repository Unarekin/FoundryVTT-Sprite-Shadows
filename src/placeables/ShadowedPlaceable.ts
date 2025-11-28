import { LocalizedError } from "errors/LocalizedError";
import { TintFilter } from "filters";
import { HandleEmptyObject } from "fvtt-types/utils";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, StencilShadowConfiguration } from "types";

interface PlaceableSize {
  width: number;
  height: number;
}

export function PlaceableMixin<t extends typeof foundry.canvas.placeables.PlaceableObject>(base: t) {
  abstract class ShadowedPlaceable extends base {
    protected blobSprite: PIXI.Sprite | undefined = undefined;
    protected stencilSprite: PIXI.Sprite | undefined = undefined;

    protected abstract getFlags(): DeepPartial<ShadowConfiguration>;
    protected abstract getDocument(): foundry.abstract.Document.Any;
    protected abstract getMesh(): foundry.canvas.primary.PrimarySpriteMesh | undefined;
    protected abstract getSize(): PlaceableSize;

    /**
     * The full configuration for this object's shadow
     * @return {ShadowConfiguration} {@link ShadowConfiguration}
     */
    public get shadowConfiguration(): ShadowConfiguration {
      const flags = this.getFlags();
      if (!flags?.type) return foundry.utils.deepClone(DefaultShadowConfiguration);

      switch (flags.type) {
        case "stencil":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(flags as StencilShadowConfiguration)
          )
        case "blob":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(flags as BlobShadowConfiguration)
          );
      }
    }

    /**
     * Hides the placeable's shadow
     */
    public clearShadow() {
      if (this.blobSprite) this.blobSprite.visible = false;
      if (this.stencilSprite) this.stencilSprite.visible = false;

    }

    /**
     * Safely destroys a given {@link PIXI.Sprite}
     * @param sprite 
     */
    protected destroySprite(sprite: PIXI.Sprite) {
      if (Array.isArray(sprite.filters)) {
        const filters = [...sprite.filters];
        sprite.filters = [];
        filters.forEach(filter => { filter.destroy(); });
      }
      sprite.destroy();
    }

    /** @inheritdoc */
    protected _destroy(options: PIXI.IDestroyOptions | boolean | undefined): void {
      super._destroy(options);
      if (this.blobSprite) this.destroySprite(this.blobSprite);
      if (this.stencilSprite) this.destroySprite(this.stencilSprite);
    }

    protected async _draw(options: HandleEmptyObject<PlaceableObject.DrawOptions>): Promise<void> {
      await super._draw(options);
      this.refreshShadow(true);
    }


    /**
     * Convenience wrapper for adding a {@link PIXI.Filter} to a {@link PIXI.Sprite}
     * @param {PIXI.Sprite} sprite 
     * @param {PIXI.Filter} filter 
     * @returns - {@link PIXI.Filter}
     */
    protected addFilter<t extends PIXI.Filter>(sprite: PIXI.Sprite, filter: t): t {
      if (Array.isArray(sprite.filters)) sprite.filters.push(filter);
      else sprite.filters = [filter];
      return filter;
    }

    /**
     * Generates the texture used for a blob shadow
     * @param config - {@link BlobShadowConfiguration}
     * @returns - {@link PIXI.Texture}
     */
    protected generateBlobShadowTexture(config: BlobShadowConfiguration): PIXI.Texture | undefined {
      const shadow = new PIXI.Graphics();
      const size = this.getSize();


      switch (config.shape) {
        case "circle": {
          shadow.beginFill(config.color ?? 0x000000, 1);
          shadow.drawEllipse(0, 0, size.width + (config.adjustments?.width ?? 0), size.height + (config.adjustments?.height ?? 0));
          shadow.endFill();
          shadow.filters = [new PIXI.BlurFilter(config.blur)];
          return canvas?.app?.renderer.generateTexture(shadow);
        }
      }
      throw new LocalizedError("TEXTUREGEN");
    }

    /**
     * Refreshes the size, position, etc. of this placeable's blob shadow
     * @param {boolean} force - If true, will forcefully recreate the blob shadow sprite
     */
    protected refreshBlobShadow(force = false) {
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;

      const mesh = this.getMesh();
      if (!mesh) return;

      if (force && this.blobSprite) {
        this.destroySprite(this.blobSprite);
        this.blobSprite = undefined;
      }

      if (!this.blobSprite) {
        // Create sprite
        const texture = this.generateBlobShadowTexture(config);
        if (!texture) throw new LocalizedError("TEXTUREGEN");
        this.blobSprite = new PIXI.Sprite(texture);
        this.blobSprite.name = `BlobShadow.${this.id}`;
      }

      if (this.blobSprite.parent !== mesh.parent) {
        const index = mesh.parent.getChildIndex(mesh);
        mesh.parent.addChildAt(this.blobSprite, index);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.blobSprite as any).sortLayer = mesh.sortLayer;

      this.blobSprite.visible = true;
      this.blobSprite.alpha = config.alpha;
      this.blobSprite.anchor.x = this.blobSprite.anchor.y = 0.5;
      this.blobSprite.x = mesh.x + (config.adjustments?.x ?? 0) - ((config.adjustments?.width ?? 0) / 2);
      this.blobSprite.y = mesh.y + (mesh.height * mesh.anchor.y) + (config.adjustments?.y ?? 0) + ((config.adjustments?.width ?? 0) / 2);

      if (config.adjustForElevation) {
        if (config.liftToken) {
          mesh.y -= ((config.elevationIncrement ?? 0) * this.scene.grid.distance * Math.max(mesh.elevation, 0));
        } else {
          this.blobSprite.y += ((config.elevationIncrement ?? 0) * this.scene.grid.distance * Math.max(mesh.elevation, 0));
        }
      }

      const filter = this.addFilter<TintFilter>(this.blobSprite, ((this.blobSprite.filters ?? []).find(filter => filter instanceof TintFilter)) ?? new TintFilter());
      filter.color = config.color ?? "#000000";

      this.blobSprite.width = mesh.width + (config.adjustments?.width ?? 0);
      this.blobSprite.height = (mesh.height * (config.alignment === "bottom" ? .25 : 1)) + (config.adjustments?.height ?? 0);
      this.blobSprite.zIndex = mesh.zIndex;
    }
    /**
     * Refreshes thes ize, position, etc. of this placeable's stencil shadow
     * @param {boolean} force - If true, will forcefully recreate the stencil shadow sprite
     */
    protected refreshStencilShadow(force = false) {
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "stencil")) return;

      const mesh = this.getMesh();
      if (!mesh?.texture) return;
      if (force && this.stencilSprite) {
        this.destroySprite(this.stencilSprite);
        this.stencilSprite = undefined;
      }

      if (!this.stencilSprite) {
        // (Re-)create
        const texture = mesh.texture.clone();
        this.stencilSprite = new PIXI.Sprite(texture);
        this.stencilSprite.name = `StencilShadow.${this.id}`;
      }

      if (this.stencilSprite.parent !== mesh.parent)
        mesh.parent.addChild(this.stencilSprite);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.stencilSprite as any).sortLayer = mesh.sortLayer;

      this.stencilSprite.anchor.x = mesh.anchor.x;
      this.stencilSprite.anchor.y = mesh.anchor.y;

      this.stencilSprite.x = mesh.x;
      this.stencilSprite.y = mesh.y;
      this.stencilSprite.scale.x = mesh.scale.x;
      this.stencilSprite.scale.y = mesh.scale.y;
      this.stencilSprite.skew.x = config.skew ?? 0;

      if (config.adjustments?.x) this.stencilSprite.x += config.adjustments.x;
      if (config.adjustments?.y) this.stencilSprite.y += config.adjustments.y;
      if (config.adjustments?.width) this.stencilSprite.width += config.adjustments.width;
      if (config.adjustments?.height) this.stencilSprite.height += config.adjustments.height;

      const filter = this.addFilter<TintFilter>(this.stencilSprite, ((this.stencilSprite.filters ?? []).find(filter => filter instanceof TintFilter)) ?? new TintFilter());
      filter.color = config.color ?? "#000000";
      this.stencilSprite.alpha = config.alpha;
      this.stencilSprite.visible = true;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.stencilSprite as any).sort = mesh.sort;
      this.stencilSprite.zIndex = mesh.zIndex - 1;
    }

    /**
     * Refreshes the size, position, etc. of this placeable's shadow, if any
     * @param {boolean} force - If true, will forcefully recreate this object's shadow sprite
     */
    protected refreshShadow(force = false) {
      // Allow for adjustments while rendering this object's DocumentSheet,
      // so that changes in positioning, etc. can be previewed
      if (!force && this.sheet?.rendered) return;

      const shadowConfig = this.shadowConfiguration;
      // A bit non-standard: game.settings.settings.get will check to see if the setting is registered, in the case
      // that this object's _draw function is called before the module has registered properly
      const enabled = shadowConfig.enabled && (game?.settings?.settings.get(`${__MODULE_ID__}.enableShadows`) && game?.settings?.get(__MODULE_ID__, "enableShadows"));

      if (this.blobSprite && (!enabled || shadowConfig.type !== "blob")) this.blobSprite.visible = false;
      if (this.stencilSprite && (!enabled || shadowConfig.type !== "stencil")) this.stencilSprite.visible = false;


      switch (shadowConfig.type) {
        case "blob":
          this.refreshBlobShadow(force);
          break;
        case "stencil":
          this.refreshStencilShadow(force);
          break;
        default:
          this.clearShadow();
      }
    }


    protected _refreshPosition() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      super._refreshPosition();
      this.refreshShadow();
    }

    protected _refreshSize() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      super._refreshSize();
      this.refreshShadow();
    }

    protected _refreshMesh() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      super._refreshMesh();
      this.refreshShadow();
    }

    protected _refreshState() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      super._refreshState();
      this.refreshShadow();
    }
  }

  return ShadowedPlaceable;
}