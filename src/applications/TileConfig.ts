import { DeepPartial, ShadowConfigSource, ShadowConfiguration } from "types";
import { ConfigMixin } from "./ConfigMixin";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";

export function TileConfigMixin<t extends typeof foundry.applications.sheets.TileConfig>(base: t) {
  class ShadowedTileConfig extends ConfigMixin(base) {

    protected getShadowedObject() { return this.document.object ?? undefined }

    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined {
      //return (this as any).document.flags[__MODULE_ID__];
      const configSource = this.document.getFlag(__MODULE_ID__, "configSource") ?? "tile";
      switch (configSource) {
        case "scene":
          return this.document.parent?.flags[__MODULE_ID__];
        case "tile":
          return this.document.getFlag(__MODULE_ID__, "config");
        case "global":
          return game.settings?.get(__MODULE_ID__, "globalConfig");
      }
    }

    protected async _prepareContext(options: DeepPartial<TokenConfig.RenderOptions>): Promise<ShadowConfigContext<TileConfig.RenderContext>> {
      const context = await super._prepareContext(options);
      context.shadows.allowConfigSource = true

      context.shadows.configSource = this.overrideShadowConfigSource ?? this.document.getFlag(__MODULE_ID__, "configSource") ?? "tile";
      context.shadows.configSourceSelect = {
        tile: "DOCUMENT.Tile",
        scene: "DOCUMENT.Scene",
        global: "SPRITESHADOWS.SETTINGS.SOURCE.GLOBAL"
      }
      return context;
    }

    protected getOriginalShadowedObject() { return undefined; }

    protected hideShadowsForPreview() {
      // TODO: Implement this
    }

    protected unhideShadowsForPreview() {
      // TODO: Impelment this
    }

    protected async loadShadowConfigSettings(source: ShadowConfigSource) {
      let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;
      switch (source) {
        case "tile":
          flags = foundry.utils.deepClone(this.document.getFlag(__MODULE_ID__, "config") ?? DefaultShadowConfiguration);
          break;
        case "scene":
          if (this.document.parent) flags = foundry.utils.deepClone(this.document.parent.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
          break;
        case "global":
          flags = foundry.utils.deepClone(game.settings?.get(__MODULE_ID__, "globalConfig"));
          break;
      }

      if (!flags) return;
      const actualFlags = flags.type === "blob" ? foundry.utils.deepClone(DefaultBlobShadowConfiguration) : flags.type === "stencil" ? foundry.utils.deepClone(DefaultStencilShadowConfiguration) : undefined;
      if (!actualFlags) return;
      foundry.utils.mergeObject(actualFlags, flags);

      this.overrideShadowFlags = flags;
      this.overrideShadowConfigSource = source;

      console.log("loadShadowConfigSettings:", source, flags);
      await this.render();
    }

    async _processSubmitData(event: SubmitEvent, form: HTMLFormElement, submitData: foundry.applications.ux.FormDataExtended, options?: any): Promise<void> {
      const flags = this.parseShadowFormData() as ShadowConfiguration & { configSource?: ShadowConfigSource };
      const configSource = flags.configSource ?? "tile";
      delete flags.configSource;

      foundry.utils.setProperty(submitData, `flags.${__MODULE_ID__}.configSource`, configSource);
      if (configSource === "tile") {
        foundry.utils.setProperty(submitData, `flags.${__MODULE_ID__}.config`, flags);
      }
      await super._processSubmitData(event, form, submitData, options);
    }
  }

  // ShadowedTileConfig.TABS.sheet.tabs.push({
  //   id: "shadows",
  //   icon: "fa-solid fa-lightbulb",
  //   cssClass: ""
  // });

  // // Inject our configuration part before the footer
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  // const parts = (base as any).PARTS as Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart>;
  // const footer = parts.footer;
  // delete parts.footer;

  // foundry.utils.mergeObject(parts, {
  //   shadows: {
  //     template: `modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`,
  //     scrollable: ['.scrollable'],
  //     templates: [
  //       `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
  //       `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
  //     ]
  //   },
  //   footer
  // });

  // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  // foundry.utils.mergeObject((base as any).PARTS ?? {}, parts);

  // ((canvas?.scene?.tiles.contents ?? [])).forEach(tile => {
  //   if (tile.sheet && !(tile.sheet instanceof ShadowedTileConfig)) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //     tile._sheet = new ShadowedTileConfig(tile.sheet.options);
  //   }

  // })

  return ShadowedTileConfig;
}
