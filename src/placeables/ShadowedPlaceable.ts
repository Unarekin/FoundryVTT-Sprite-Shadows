import { LocalizedError } from "errors";
import { TintFilter } from "filters";
import { cartesianToIso } from "functions";
import { HandleEmptyObject } from "fvtt-types/utils";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadow, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, IsometricFlags, MeshAdjustments, OldStencilShadowType, ShadowConfiguration, StencilShadow, StencilShadowConfiguration } from "types";

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
    protected stencilSprites: PIXI.Sprite[] = [];

    protected abstract getShadowFlags(): DeepPartial<ShadowConfiguration>;
    protected abstract getShadowDocument(): foundry.abstract.Document.Any;
    protected abstract getMesh(): foundry.canvas.primary.PrimarySpriteMesh | undefined;
    protected abstract getSize(): PlaceableSize;

    protected getAnimationDocument(): foundry.abstract.Document.Any { return this.getShadowDocument(); }

    protected migrateShadowSettings(config: DeepPartial<ShadowConfiguration>): ShadowConfiguration {

      let migratedFlags: ShadowConfiguration | undefined = undefined;
      switch (config.type) {
        case "blob":
          migratedFlags = foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(config as BlobShadowConfiguration)
          );
          break;
        case "stencil":
          migratedFlags = this.migrateStencilShadowSettings(foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultStencilShadowConfiguration),
            foundry.utils.deepClone(config as StencilShadowConfiguration)
          ));
          break;
      }

      if (migratedFlags) return migratedFlags;
      else return config as ShadowConfiguration;
    }

    protected migrateStencilShadowSettings(config: StencilShadowConfiguration | OldStencilShadowType): StencilShadowConfiguration {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      if (config.type !== "stencil") return config as any;
      // The easiest way to determine the difference between the two versions is the presence or absence of a shadows array.
      if (Array.isArray((config as StencilShadowConfiguration).shadows)) return config as StencilShadowConfiguration;

      const newConfig = foundry.utils.deepClone(DefaultStencilShadowConfiguration);
      if (!newConfig.shadows.length) newConfig.shadows = [foundry.utils.deepClone(DefaultStencilShadow)];

      const oldConfig = foundry.utils.deepClone(config as DeepPartial<OldStencilShadowType>);

      const shadow = newConfig.shadows[0];
      shadow.id = foundry.utils.randomID();
      delete oldConfig.type;
      foundry.utils.mergeObject(shadow, oldConfig);

      return newConfig;
    }

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

    protected getShadowAdjustmentMultipliers(): { x: number, y: number, width: number, height: number } {
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

    protected getShadowAdjustments(config: { [key: string]: any, adjustments: MeshAdjustments }): MeshAdjustments {
      const adjustments = config.adjustments;
      const multipliers = this.getShadowAdjustmentMultipliers();
      return {
        enabled: adjustments.enabled,
        x: adjustments.x * multipliers.x,
        y: adjustments.y * multipliers.y,
        width: adjustments.width * multipliers.width,
        height: adjustments.height * multipliers.height,
        anchor: {
          x: adjustments.anchor.x,
          y: adjustments.anchor.y
        }
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
      if (Array.isArray(this.stencilSprites) && this.stencilSprites.length)
        this.stencilSprites.forEach(sprite => sprite.visible = false)
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
      if (Array.isArray(this.stencilSprites) && this.stencilSprites.length)
        this.stencilSprites.forEach(sprite => { this.destroySprite(sprite) });
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
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;
      if (!this.blobSprite) return;

      const mesh = this.getMesh();
      if (!mesh) return;

      const doc = this.document as TokenDocument | TileDocument | undefined;
      // If no document, we're not in a scene, so no need to position.
      if (!doc) return;


      const bounds = this.getBlobSpriteBounds();

      this.blobSprite.x = bounds.x; //doc.x + ((doc.width * this.scene.dimensions.size) * this.blobSprite.anchor.x);
      this.blobSprite.y = bounds.y;
      // if (config.alignment === "bottom")
      //   this.blobSprite.y = bounds.y //doc.y + ((doc.height * this.scene.dimensions.size));
      // else
      //   this.blobSprite.y = bounds.y //doc.y + ((doc.height * this.scene.dimensions.size) * this.blobSprite.anchor.y);

      // Apply adjustments
      const adjustments = this.getShadowAdjustments(config);
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
      if (!this.blobSprite) return;

      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;

      const doc = this.document as TokenDocument | TileDocument;
      if (!doc) return;

      const mesh = this.getMesh();
      if (!mesh) return;

      const adjustments = this.getShadowAdjustments(config);

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
          mesh.y -= elevationOffsets.y;
          mesh.x += elevationOffsets.x;
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

      if (!this.isShadowVisible()) {
        this.blobSprite.renderable = false;
      } else {
        this.blobSprite.renderable = true;
        if (this.blobSprite.parent !== mesh.parent) {
          const index = mesh.parent.getChildIndex(mesh);
          mesh.parent.addChildAt(this.blobSprite, index);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (this.blobSprite as any).sortLayer = mesh.sortLayer;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (this.blobSprite as any).elevation = mesh.elevation;

        const adjustments = this.getShadowAdjustments(config);

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
    }

    protected isShadowVisible(): boolean {
      if (!canvas?.visibility) return true;
      if (!canvas?.scene) return false;


      if (canvas.visibility.testVisibility({ x: this.x, y: this.y })) return true;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { width, height } = ((this.document as any) ?? { width: 1, height: 1 });


      if (canvas.visibility.testVisibility({ x: this.x + (width * canvas.scene.dimensions.size), y: this.y })) return true;
      if (canvas.visibility.testVisibility({ x: this.x, y: this.y + (height * canvas.scene.dimensions.size) })) return true;
      if (canvas.visibility.testVisibility({ x: this.x + (width * canvas.scene.dimensions.size), y: this.y + (height * canvas.scene.dimensions.size) })) return true;
      return false;
    }

    protected refreshStencilShadowItem(shadow: StencilShadow, sprite: PIXI.Sprite) {
      if (!this.isShadowVisible()) {
        sprite.renderable = false;
        return;
      }


    }

    protected createStencilShadowSprite(config: StencilShadow): PIXI.Sprite | undefined {
      const mesh = this.getMesh();
      if (!mesh) return;
      const texture = !(config.useImage && config.image) ? mesh.texture?.clone() : PIXI.Texture.from(config.image);
      const sprite = new PIXI.Sprite(texture);
      sprite.name = `StencilShadow.${config.id}`;
      return sprite;
    }

    public setStencilShadowConfig(sprite: PIXI.Sprite, config: StencilShadow, mesh: foundry.canvas.primary.PrimarySpriteMesh) {
      if (!this.isShadowVisible()) {
        sprite.renderable = false;
      } else {
        sprite.renderable = true;

        if (mesh.parent && sprite.parent !== mesh.parent) mesh.parent.addChild(sprite);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (sprite as any).sortLayer = mesh.sortLayer;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (sprite as any).elevation = mesh.elevation;

        sprite.x = mesh.x;
        if (config.alignment === "bottom")
          sprite.y = mesh.y + (mesh.height * (1 - mesh.anchor.y));
        else
          sprite.y = mesh.y;

        sprite.anchor.set(config.adjustments?.anchor?.x ?? 0.5, config.adjustments?.anchor?.y ?? (config.alignment === "bottom" ? 1 : 0.5));

        const scale = this.getModifiedScale();
        sprite.scale.set(scale.x, scale.y);

        sprite.skew.x = config.skew ?? 0;

        const adjustments = this.getShadowAdjustments(config);
        if (adjustments?.x) sprite.x += adjustments.x;
        if (adjustments?.y) sprite.y += adjustments.y;
        if (adjustments?.width) sprite.width += adjustments.width;
        if (adjustments?.height) sprite.height += adjustments.height;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const blur = this.upsertFilter<PIXI.BlurFilter>(sprite, PIXI.BlurFilter as any);
        blur.blur = config.blur;

        const tint = this.upsertFilter<TintFilter>(sprite, TintFilter);
        tint.color = new PIXI.Color(config.color ?? 0x000000).toHex();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if ((this.getShadowDocument() as any).hidden) sprite.alpha = 0;
        else sprite.alpha = config.alpha;

        sprite.visible = true;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (sprite as any).sort = mesh.sort;
        sprite.zIndex = mesh.zIndex - 1;

        sprite.angle = config.rotation;
      }
    }

    protected upsertFilter<t extends PIXI.Filter>(sprite: PIXI.Sprite, filterType: typeof PIXI.Filter): t {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return (Array.isArray(sprite.filters) ? sprite.filters : []).find(filter => filter instanceof filterType) ?? this.addFilter(sprite, new filterType()) as any;
    }

    /**
     * Refreshes thes ize, position, etc. of this placeable's stencil shadow
     * @param {boolean} force - If true, will forcefully recreate the stencil shadow sprite
     */
    protected refreshStencilShadow(force = false) {
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "stencil")) return;

      if (force && this.stencilSprites) {
        for (const sprite of this.stencilSprites)
          this.destroySprite(sprite);
        this.stencilSprites = [];
      }

      const mesh = this.getMesh();
      if (!mesh?.texture) return;

      for (let i = 0; i < config.shadows.length; i++) {
        const shadowConfig = config.shadows[i];
        if (!this.stencilSprites[i]) {
          const sprite = this.createStencilShadowSprite(shadowConfig);
          if (!sprite) throw new LocalizedError("TEXTUREGEN");
          this.stencilSprites.push(sprite);
        }
        const sprite = this.stencilSprites[i];

        if (!sprite) throw new LocalizedError("TEXTUREGEN");

        this.setStencilShadowConfig(sprite, shadowConfig, mesh);

      }
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
      if (Array.isArray(this.stencilSprites) && (!enabled || shadowConfig.type !== "stencil"))
        this.stencilSprites.forEach(sprite => sprite.visible = false)


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