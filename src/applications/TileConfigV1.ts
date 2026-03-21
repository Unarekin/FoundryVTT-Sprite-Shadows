import { DeepPartial, ShadowConfigSource, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";

export function TileConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<TileDocument>>(base: t) {
  class ShadowedTileConfigV1 extends ConfigMixinV1(base) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined { return (this as any).document.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return this.document.object ?? undefined }

    protected prepareContext(): ShadowConfigContext<any> {
      const context = super.prepareContext() as ShadowConfigContext<Record<string, unknown>>;
      context.shadows.allowConfigSource = true;
      context.omitGroup = true;
      context.shadows.configSourceSelect = {
        tile: "DOCUMENT.Tile",
        scene: "DOCUMENT.Scene",
        global: "SPRITESHADOWS.SETTINGS.SOURCE.GLOBAL"
      }
      return context;
    }

    protected loadShadowConfigSettings(source: ShadowConfigSource): void {
      let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;
      switch (source) {
        case "tile": {
          flags = this.document.getFlag(__MODULE_ID__, "config");
          break;
        }
        case "scene": {
          if (this.document?.parent) flags = foundry.utils.deepClone(this.document.parent.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
          break;
        }
        case "global": {
          flags = foundry.utils.deepClone(game.settings?.get(__MODULE_ID__, "globalConfig"));
          break;
        }
      }

      if (!flags) return;
      const actualFlags = flags.type === "blob" ? foundry.utils.deepClone(DefaultBlobShadowConfiguration) : flags.type === "stencil" ? foundry.utils.deepClone(DefaultStencilShadowConfiguration) : undefined;
      if (!actualFlags) return;
      foundry.utils.mergeObject(actualFlags, flags);

      this.overrideShadowFlags = foundry.utils.deepClone(actualFlags);
      this.overrideShadowConfigSource = source;
      this.render();
    }

    protected async setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config) as ShadowConfiguration & { configSource?: ShadowConfigSource };

      const configSource = flags.configSource ?? "tile";
      delete flags.configSource;
      await this.document.update({
        flags: {
          [__MODULE_ID__]: {
            config: flags,
            configSource
          }
        }
      })
    }
  }

  /*
  ((canvas?.scene?.tokens.contents ?? [])).forEach(token => {
    if (token.sheet && !(token.sheet instanceof ShadowedTokenConfigV1)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        token._sheet = new ShadowedTokenConfigV1(token.sheet.options);
      } catch (err) {
        console.warn(err);
      }
    }
  })
  */
  ((canvas?.scene?.tiles.contents ?? [])).forEach(tile => {
    if (tile.sheet && !(tile.sheet instanceof ShadowedTileConfigV1)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        tile._sheet = new ShadowedTileConfigV1(tile, tile.sheet.options);
      } catch (err) {
        console.warn(err);
      }
    }
  })

  return ShadowedTileConfigV1;
}