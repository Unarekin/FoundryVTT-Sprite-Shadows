import { LocalizedError } from "./errors";
import { HandleEmptyObject } from "fvtt-types/utils"
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, ShadowConfiguration, StencilShadowConfiguration } from "types";
import { TintFilter } from "./filters";

export function TokenMixin(base: typeof foundry.canvas.placeables.Token) {
  return class ShadowedToken extends base {

    #blobSprite: PIXI.Sprite | undefined = undefined;
    #stencilSprite: PIXI.Sprite | undefined = undefined;

    public readonly isShadowedToken = true;

    public get shadowConfiguration(): ShadowConfiguration {
      switch (this.actor?.flags[__MODULE_ID__]?.type) {
        case "blob":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(this.actor.flags[__MODULE_ID__]) as BlobShadowConfiguration
          );
        case "stencil":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultStencilShadowConfiguration),
            foundry.utils.deepClone(this.actor.flags[__MODULE_ID__]) as StencilShadowConfiguration
          );
        default:
          return foundry.utils.deepClone(DefaultShadowConfiguration);
      }
    }

    protected generateBlobShadowTexture(config: BlobShadowConfiguration): PIXI.Texture | undefined {

      switch (config.shape) {
        case "circle": {
          const shadow = new PIXI.Graphics();
          shadow.beginFill(config.color ?? 0x000000, 1);

          const width = this.document.width * this.scene.grid.size;
          const height = this.document.height * this.scene.grid.size;

          shadow.drawEllipse(0, 0, width + config.adjustments.width, (height * .25) + config.adjustments.height);
          shadow.endFill();
          shadow.filters = [new PIXI.BlurFilter(config.blur)];

          return canvas?.app?.renderer.generateTexture(shadow);
        }
      }
    }

    protected refreshBlobShadow() {
      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "blob")) return;

      if (!this.mesh) return;

      if (!this.#blobSprite) {
        const texture = this.generateBlobShadowTexture(config);
        if (!texture) throw new LocalizedError("TEXTUREGEN");

        this.#blobSprite = new PIXI.Sprite(texture);
        this.#blobSprite.name = `BlobShadow.${this.id}`;
      }

      this.mesh.parent.addChild(this.#blobSprite);

      const width = this.document.width * this.scene.grid.size;
      const height = this.document.height * this.scene.grid.size;

      this.#blobSprite.visible = true;
      this.#blobSprite.alpha = config.alpha;
      this.#blobSprite.anchor.x = 0.5;
      this.#blobSprite.anchor.y = 0.5;
      this.#blobSprite.x = this.mesh.x + config.adjustments.x - (config.adjustments.width / 2);
      this.#blobSprite.y = this.mesh.y + (this.mesh.height * this.mesh.anchor.y) + config.adjustments.y + (config.adjustments.width / 2);

      if (config.adjustForElevation) {
        if (config.liftToken) {
          this.mesh.y -= (config.elevationIncrement * this.scene.grid.distance * Math.max(this.document.elevation, 0));
        } else {
          this.#blobSprite.y += (config.elevationIncrement * this.scene.grid.distance * Math.max(this.document.elevation, 0));
        }
      }

      this.#blobSprite.width = width + config.adjustments.width;
      this.#blobSprite.height = (height * 0.25) + config.adjustments.height;

    }

    protected refreshStencilShadow() {

      const config = this.shadowConfiguration;
      if (!(config.enabled && config.type === "stencil")) return;

      if (!this.mesh?.texture) return;
      if (!this.#stencilSprite || this.#stencilSprite.texture.baseTexture.resource.src !== this.texture?.baseTexture.resource.src) {

        const texture = this.mesh.texture.clone();
        const sprite = new PIXI.Sprite(texture);
        if (this.#stencilSprite) this.#stencilSprite.destroy();;
        this.#stencilSprite = sprite;

      }

      this.mesh.parent.addChild(this.#stencilSprite);
      this.#stencilSprite.anchor.x = 0.5;
      this.#stencilSprite.anchor.y = 1;
      this.#stencilSprite.x = this.mesh.x + (config.adjustments?.x ?? 0);
      this.#stencilSprite.y = this.mesh.y + (this.mesh.height * this.mesh.anchor.y) + (config.adjustments?.y ?? 0);
      const width = this.document.width * this.scene.grid.size;
      const height = this.document.height * this.scene.grid.size;
      this.#stencilSprite.width = width + (config.adjustments?.width ?? 0);
      this.#stencilSprite.height = height + (config.adjustments?.height ?? 0);

      this.#stencilSprite.skew.x = config.skew;

      const filter = ((this.#stencilSprite.filters ?? []).find(filter => filter instanceof TintFilter)) ?? new TintFilter();
      if (!Array.isArray(this.#stencilSprite.filters)) this.#stencilSprite.filters = [filter];
      else if (!this.#stencilSprite.filters.includes(filter)) this.#stencilSprite.filters.push(filter);

      filter.color = config.color;
      this.#stencilSprite.alpha = config.alpha;
    }

    public clearShadow() {
      if (this.#blobSprite) this.#blobSprite.visible = false;
    }

    public refreshShadow() {
      const shadowConfig = this.shadowConfiguration;
      if (shadowConfig.enabled) {
        switch (shadowConfig.type) {
          case "blob":
            this.refreshBlobShadow();
            break;
          case "stencil":
            this.refreshStencilShadow();
            break;
          default:
            this.clearShadow();
        }
      }

    }

    protected async _draw(options: HandleEmptyObject<Token.DrawOptions> | undefined): Promise<void> {
      await super._draw(options);
      this.refreshShadow();
    }

    protected _refreshPosition(): void {
      super._refreshPosition();
      this.refreshShadow();
    }

    protected _refreshSize(): void {
      super._refreshSize();
      this.refreshShadow();
    }

    protected _refreshMesh(): void {
      super._refreshMesh();
      this.refreshShadow();
    }

    protected _refreshElevation(): void {
      super._refreshElevation();
      this.refreshShadow();
    }

    protected destroySprite(sprite: PIXI.Sprite) {
      if (Array.isArray(sprite.filters)) {
        const filters = [...sprite.filters];
        sprite.filters = [];
        filters.forEach(filter => { filter.destroy(); });
      }
      sprite.destroy();
    }

    protected _destroy(options: PIXI.IDestroyOptions | boolean | undefined): void {
      super._destroy(options);

      if (this.#blobSprite) this.destroySprite(this.#blobSprite);
      if (this.#stencilSprite) this.destroySprite(this.#stencilSprite);
    }
  }
}