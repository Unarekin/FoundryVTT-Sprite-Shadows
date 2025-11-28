import { DeepPartial, ShadowConfiguration } from "types";
import { ConfigMixin } from "./ConfigMixin";

export function TileConfigMixin<t extends typeof foundry.applications.sheets.TileConfig>(base: t) {
  class ShadowedTileConfig extends ConfigMixin(base) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getFlags(): DeepPartial<ShadowConfiguration> | undefined { return (this as any).document.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return this.document.object ?? undefined }

    protected setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config);
      return this.document.update({
        flags: {
          [__MODULE_ID__]: flags
        }
      });
      return flags;
    }
  }

  ShadowedTileConfig.TABS.sheet.tabs.push({
    id: "shadows",
    icon: "fa-solid fa-lightbulb",
    cssClass: ""
  });

  // Inject our configuration part before the footer
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const parts = (base as any).PARTS as Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart>;
  const footer = parts.footer;
  delete parts.footer;

  foundry.utils.mergeObject(parts, {
    shadows: {
      template: `modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`,
      templates: [
        `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
        `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
      ]
    },
    footer
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  foundry.utils.mergeObject((base as any).PARTS ?? {}, parts);

  ((canvas?.scene?.tiles.contents ?? [])).forEach(tile => {
    if (tile.sheet && !(tile.sheet instanceof ShadowedTileConfig)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      tile._sheet = new ShadowedTileConfig(tile.sheet.options);
    }

  })

  return ShadowedTileConfig;
}
