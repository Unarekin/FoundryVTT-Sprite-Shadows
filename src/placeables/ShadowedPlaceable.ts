import { LocalizedError } from "errors";
import { TintFilter } from "filters";
import { cartesianToIso } from "functions";
import { HandleEmptyObject } from "fvtt-types/utils";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, IsometricFlags, MeshAdjustments, ShadowConfiguration, StencilShadowConfiguration } from "types";

interface PlaceableSize {
  width: number;
  height: number;
}

interface FastFlipSettings {
  tileMirrorVertical?: boolean;
  tileMirrorHorizontal?: boolean;
}

export function PlaceableMixin<t extends typeof foundry.canvas.placeables.PlaceableObject>(base: t) {
  abstract class ShadowedPlaceable extends base {
    protected blobSprite: PIXI.Sprite | undefined = undefined;
    protected stencilSprite: PIXI.Sprite | undefined = undefined;

    protected abstract getShadowFlags(): DeepPartial<ShadowConfiguration>;
    protected abstract getShadowDocument(): foundry.abstract.Document.Any;
    protected abstract getMesh(): foundry.canvas.primary.PrimarySpriteMesh | undefined;
    protected abstract getSize(): PlaceableSize;

    protected getAnimationDocument(): foundry.abstract.Document.Any { return this.getShadowDocument(); }

    protected getModifiedScale(): { x: number, y: number } {
      const scale = this.getMesh()?.scale ?? { x: 1, y: 1 };

      const newScale = {
        x: scale.x,
        y: scale.y
      }

      // Account for the Fast Flip module, which does not use the object's scale to handle flipping
      if (game?.modules?.get("fast-flip")?.active) {
        const fastFlip: FastFlipSettings = {
          tileMirrorHorizontal: false,
          tileMirrorVertical: false,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ...((this.document.flags as any)["fast-flip"] as FastFlipSettings ?? {})
        }

        if (fastFlip.tileMirrorHorizontal) newScale.x *= -1;
        if (fastFlip.tileMirrorVertical) newScale.y *= -1;
      }

      return newScale;
    }

    public get shouldUseIsometric(): boolean {
      if (!game?.modules?.get("isometric-perspective")?.active) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!this.scene?.flags["isometric-perspective"].isometricEnabled) return false;
      if (this.shadowConfiguration.type !== "blob") return false;
      const flags = this.getIsometricFlags();
      if (flags?.isoTokenDisabled) return false;
      return true;
    }

    protected getAdjustmentMultipliers(): { x: number, y: number, width: number, height: number } {
      return {
        x: 1,
        y: 1,
        width: 1,
        height: 1
      }
    }

    protected getElevationAdjustment(): number {
      const config = this.shadowConfiguration;
      if (config.type !== "blob") return 0;
      if (!config.adjustForElevation) return 0;
      if (config.elevationIncrement === 0) return 0;
      const doc = this.getShadowDocument() as TokenDocument | TileDocument;
      if (!doc) return 0;

      const gridSquares = doc.elevation / this.scene.grid.distance;

      return gridSquares * this.scene.dimensions.size * config.elevationIncrement;
    }

    protected getAdjustments(): MeshAdjustments {
      const adjustments = this.shadowConfiguration.adjustments;
      const multipliers = this.getAdjustmentMultipliers();
      return {
        enabled: adjustments.enabled,
        x: adjustments.x * multipliers.x,
        y: adjustments.y * multipliers.y,
        width: adjustments.width * multipliers.width,
        height: adjustments.height * multipliers.height
      }
    }

    /**
     * The full configuration for this object's shadow
     * @return {ShadowConfiguration} {@link ShadowConfiguration}
     */
    public get shadowConfiguration(): ShadowConfiguration {
      const flags = this.getShadowFlags();
      if (!flags?.type) return foundry.utils.deepClone(DefaultShadowConfiguration);

      switch (flags.type) {
        case "stencil":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultStencilShadowConfiguration),
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
          const width = size.width + (config.adjustments?.width ?? 0);
          const height = size.height + (config.adjustments?.height ?? 0);
          shadow.drawEllipse(0, 0, width, height);
          shadow.endFill();
          shadow.filters = [new PIXI.BlurFilter(config.blur)];

          const container = new PIXI.Container();
          container.addChild(shadow);
          shadow.x = shadow.y = config.blur;

          const padding = new PIXI.Graphics();
          padding.beginFill("transparent")
          padding.drawRect(0, 0, width, height);
          container.addChild(padding);
          padding.x = padding.y = config.blur * 2;
          padding.alpha = 0;

          return canvas?.app?.renderer.generateTexture(container);
        }
      }
      throw new LocalizedError("TEXTUREGEN");
    }

    protected abstract getIsometricFlags(): IsometricFlags | undefined;

    protected positionBlobShadowOrthographic() {
      console.log("Calling positionBlobShadowOrthographic");
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;
      if (!this.blobSprite) return;

      const mesh = this.getMesh();
      if (!mesh) return;

      const doc = this.document as TokenDocument | TileDocument | undefined;
      // If no document, we're not in a scene, so no need to position.
      if (!doc) return;

      // const adjustments = this.getAdjustments();

      const bounds = this.getBlobSpriteBounds();

      this.blobSprite.x = bounds.x; //doc.x + ((doc.width * this.scene.dimensions.size) * this.blobSprite.anchor.x);
      this.blobSprite.y = bounds.y;
      // if (config.alignment === "bottom")
      //   this.blobSprite.y = bounds.y //doc.y + ((doc.height * this.scene.dimensions.size));
      // else
      //   this.blobSprite.y = bounds.y //doc.y + ((doc.height * this.scene.dimensions.size) * this.blobSprite.anchor.y);

      // Apply adjustments
      const adjustments = this.getAdjustments();
      if (adjustments) {
        if (typeof adjustments.x === "number") this.blobSprite.x += adjustments.x;
        if (typeof adjustments.y === "number") this.blobSprite.y += adjustments.y;
        if (typeof adjustments.width === "number") this.blobSprite.width += adjustments.width;
        if (typeof adjustments.height === "number") this.blobSprite.height += adjustments.height;
      }

      const meshPos = this.getMeshPosition();
      // Handle elevation adjustment
      if (config.adjustForElevation && doc.elevation) {
        const elevationAdjustment = this.getElevationAdjustment();
        if (config.liftToken)
          mesh.y = meshPos.y - elevationAdjustment;
          // mesh.y = this.y + (doc.height * this.scene.dimensions.size * mesh.anchor.y) + this.scene.dimensions.sceneY - elevationAdjustment;
        else
          this.blobSprite.y += elevationAdjustment;
      } else {
        mesh.y = meshPos.y;
        // mesh.y = this.y;
        // mesh.y = this.y + (doc.height * this.scene.dimensions.size * mesh.anchor.y) + this.scene.dimensions.sceneY;
      }
    }

    protected getMeshPosition(): { x: number, y: number } {
      const doc = this.document as TileDocument | TokenDocument;
      const mesh = this.getMesh();

      return {
        x: doc.x,
        y: doc.y + (doc.height * (mesh?.anchor?.y ?? .5))
      }
    }

    protected getBlobSpriteBounds(): { x: number, y: number, width: number, height: number } {
      const doc = this.document as TokenDocument | TileDocument;
      const mesh = this.getMesh();
      const config = this.shadowConfiguration;
      return {
        x: doc.x + (doc.width * (mesh?.anchor?.x ?? .5)),
        y: doc.y + (doc.height * ((config.alignment === "bottom" && !this.shouldUseIsometric) ? 1 : (mesh?.anchor?.y ?? .5))),
        width: doc.width,
        height: doc.height
      }
    }

    protected positionBlobShadowIsometric() {
      console.log("Calling positionBlobShadowIsometric")
      if (!this.blobSprite) return;

      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;

      const doc = this.document as TokenDocument | TileDocument;
      if (!doc) return;

      const mesh = this.getMesh();
      if (!mesh) return;

      const adjustments = this.getAdjustments();

      const { x, y, width, height } = this.getBlobSpriteBounds();

      this.blobSprite.x = x;
      this.blobSprite.y = y;
      this.blobSprite.width = width;
      this.blobSprite.height = height;

      this.blobSprite.x += adjustments.x;
      this.blobSprite.y += adjustments.y;

      if (config.adjustForElevation) {
        const pixelHeight = this.getElevationAdjustment();
        const elevationOffsets = cartesianToIso(0, pixelHeight);
        if (config.liftToken) {
          console.log(mesh.x, mesh.y);
          mesh.y -= elevationOffsets.y;
          mesh.x += elevationOffsets.x;
          console.log(mesh.x, mesh.y);
        } else {
          this.blobSprite.x -= elevationOffsets.x;
          this.blobSprite.y += elevationOffsets.y;
        }
      }
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.blobSprite as any).elevation = mesh.elevation;

      const adjustments = this.getAdjustments();

      this.blobSprite.visible = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((this.getShadowDocument() as any).hidden) this.blobSprite.alpha = 0;
      else this.blobSprite.alpha = config.alpha;

      this.blobSprite.anchor.x = this.blobSprite.anchor.y = 0.5;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (config.ignoreSpriteAnimationsMeshAdjustments && this.getAnimationDocument().flags?.["sprite-animations"]?.meshAdjustments?.enable) {
        this.blobSprite.width = (((this.document as TileDocument | TokenDocument).width ?? 1) * this.scene.dimensions.size) + (adjustments?.width ?? 0);
        this.blobSprite.height = ((((this.document as TileDocument | TokenDocument).height ?? 1) * this.scene.dimensions.size) * ((config.alignment === "bottom" && !this.shouldUseIsometric) ? .25 : 1)) + (adjustments?.height ?? 0);
      } else {
        this.blobSprite.width = mesh.width + (adjustments?.width ?? 0);
        this.blobSprite.height = (mesh.height * ((config.alignment === "bottom" && !this.shouldUseIsometric) ? .25 : 1)) + (adjustments?.height ?? 0);
      }

      if (this.shouldUseIsometric) {
        this.positionBlobShadowIsometric();
      } else {
        this.positionBlobShadowOrthographic();
      }

      const blur = (this.blobSprite.filters ?? []).find(filter => filter instanceof PIXI.BlurFilter) ?? this.addFilter<PIXI.BlurFilter>(this.blobSprite, new PIXI.BlurFilter());
      blur.blur = config.blur;

      const filter = (this.blobSprite.filters ?? []).find(filter => filter instanceof TintFilter) ?? this.addFilter<TintFilter>(this.blobSprite, new TintFilter());
      filter.color = config.color ?? "#000000";

      this.blobSprite.zIndex = mesh.zIndex - 1;

      this.blobSprite.angle = config.rotation;
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

        const texture = !(config.useImage && config.image) ? mesh.texture.clone() : PIXI.Texture.from(config.image);

        this.stencilSprite = new PIXI.Sprite(texture);
        this.stencilSprite.name = `StencilShadow.${this.id}`;
      }

      if (this.stencilSprite.parent !== mesh.parent)
        mesh.parent.addChild(this.stencilSprite);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.stencilSprite as any).sortLayer = mesh.sortLayer;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.stencilSprite as any).elevation = mesh.elevation;

      this.stencilSprite.anchor.x = mesh.anchor.x;
      this.stencilSprite.anchor.y = config.alignment === "bottom" ? 1 : 0.5;

      this.stencilSprite.x = mesh.x;
      if (config.alignment === "bottom")
        this.stencilSprite.y = mesh.y + (mesh.height * (1 - mesh.anchor.y));
      else
        this.stencilSprite.y = mesh.y;
      const scale = this.getModifiedScale();
      this.stencilSprite.scale.x = scale.x;
      this.stencilSprite.scale.y = scale.y;
      this.stencilSprite.skew.x = config.skew ?? 0;

      const adjustments = this.getAdjustments();

      if (adjustments?.x) this.stencilSprite.x += adjustments.x;
      if (adjustments?.y) this.stencilSprite.y += adjustments.y;
      if (adjustments?.width) this.stencilSprite.width += adjustments.width;
      if (adjustments?.height) this.stencilSprite.height += adjustments.height;

      const blur = (this.stencilSprite.filters ?? []).find(filter => filter instanceof PIXI.BlurFilter) ?? this.addFilter<PIXI.BlurFilter>(this.stencilSprite, new PIXI.BlurFilter());
      blur.blur = config.blur;

      const filter = (this.stencilSprite.filters ?? []).find(filter => filter instanceof TintFilter) ?? this.addFilter<TintFilter>(this.stencilSprite, new TintFilter());
      filter.color = config.color ?? "#000000";

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((this.getShadowDocument() as any).hidden) this.stencilSprite.alpha = 0;
      else this.stencilSprite.alpha = config.alpha;
      this.stencilSprite.visible = true;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this.stencilSprite as any).sort = mesh.sort;
      this.stencilSprite.zIndex = mesh.zIndex - 1;

      this.stencilSprite.angle = config.rotation;
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