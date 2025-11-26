import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types"
import { TokenConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultStencilShadowConfiguration, DefaultShadowConfiguration } from "settings";

export function TokenConfigMixin(base: typeof foundry.applications.sheets.TokenConfig) {
  class ShadowedTokenConfig extends base {
    public static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.DocumentSheetV2.Configuration<any>> = {
    }

    protected getConfiguration() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const actor: Actor = (this as any).actor instanceof Actor ? (this as any).actor : this.document.actor;

      switch (actor?.flags[__MODULE_ID__]?.type) {
        case "blob":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(actor.flags[__MODULE_ID__]) as BlobShadowConfiguration
          );
        case "stencil":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultStencilShadowConfiguration),
            foundry.utils.deepClone(actor.flags[__MODULE_ID__]) as StencilShadowConfiguration
          );
        default:
          return foundry.utils.deepClone(DefaultShadowConfiguration);
      }
    }

    protected showElements(selector: string) {
      this.element.querySelectorAll(selector)
        .forEach(elem => {
          if (elem instanceof HTMLElement)
            elem.style.display = "block";
        });
    }

    protected hideElements(selector: string) {
      this.element.querySelectorAll(selector)
        .forEach(elem => {
          if (elem instanceof HTMLElement)
            elem.style.display = "none";
        })
    }

    protected toggleConfigSections(shadowType: ShadowType) {
      switch (shadowType) {
        case "blob":
          this.hideElements(`[data-role="stencil-shadow-config"]`);
          this.showElements(`[data-role="blob-shadow-config"]`);
          break;
        case "stencil":
          this.showElements(`[data-role="stencil-shadow-config"]`);
          this.hideElements(`[data-role="blob-shadow-config"]`);
          break;
        default:
          this.hideElements(`[data-role="stencil-shadow-config"],[data-role="blob-shadow-config"]`);
      }
    }


    protected parseFlagData(data: DeepPartial<ShadowConfiguration>): ShadowConfiguration {
      const defaultValue = foundry.utils.deepClone(
        data.type === "stencil" ? DefaultStencilShadowConfiguration :
          data.type === "blob" ? DefaultBlobShadowConfiguration :
            DefaultShadowConfiguration
      );

      const newValue = foundry.utils.deepClone(data);
      const keys = Object.keys(newValue) as (keyof typeof newValue)[];
      for (const key of keys) {
        if (newValue[key] == null) delete newValue[key];
      }

      foundry.utils.mergeObject(defaultValue, newValue);
      return defaultValue;
    }

    async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event | SubmitEvent): Promise<void> {
      if (!this.form) return;
      const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as Record<string, unknown>;


      const formData = data["sprite-shadows"] as ShadowConfiguration;

      const config = this.parseFlagData(formData);
      console.log("Parsed flag data:", config);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const actor: Actor = (this as any).actor instanceof Actor ? (this as any).actor : this.document.actor;

      if (actor instanceof Actor) {
        // Awaiting this tends to try to load a URL based on this data, which makes Foundry go screwy
        actor.update({
          flags: {
            "sprite-shadows": config
          }
        }).catch(console.error);
      }

      return super._onSubmitForm(formConfig, event);
    }

    async _onRender(context: TokenConfigContext, options: foundry.applications.api.DocumentSheetV2.RenderOptions) {
      await super._onRender(context, options);
      this.toggleConfigSections(context.shadows.config.type);

      const typeSelect = this.element.querySelector(`select[name="sprite-shadows.type"]`);
      if (typeSelect instanceof HTMLSelectElement) {
        typeSelect.addEventListener("change", () => { this.toggleConfigSections(typeSelect.value as ShadowType); });
      }
    }

    async _prepareContext(options: foundry.applications.api.DocumentSheetV2.RenderOptions) {
      const context = await super._prepareContext(options) as unknown as TokenConfigContext;
      context.shadows = {
        // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        idPrefix: foundry.utils.randomID(), // this.document instanceof foundry.canvas.placeables.Token ? this.document.uuid.replaceAll(".", "-") : (this as any).actor ? `prototype-${((this as any).actor.uuid ?? "").replace(".", "-")}` : `prototype-${(this.document.actor?.uuid ?? "").replaceAll(".", "-")}`,
        config: this.getConfiguration(),
        typeSelect: {
          blob: "SPRITESHADOWS.SETTINGS.TYPE.BLOB",
          stencil: "SPRITESHADOWS.SETTINGS.TYPE.STENCIL"
        },
        alignmentSelect: {
          bottom: "SPRITESHADOWS.SETTINGS.ALIGNMENT.BOTTOM",
          center: "SPRITESHADOWS.SETTINGS.ALIGNMENT.CENTER"
        },
        blobShapeSelect: {
          circle: "SPRITESHADOWS.SETTINGS.BLOBSHAPE.CIRCLE"
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return context as any;
    }
  }

  ShadowedTokenConfig.TABS.sheet.tabs.push({
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
      template: `modules/${__MODULE_ID__}/templates/TokenConfig.hbs`,
      templates: [
        `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
        `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
      ]
    },
    footer
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  foundry.utils.mergeObject((base as any).PARTS ?? {}, parts);

  return ShadowedTokenConfig;
}
