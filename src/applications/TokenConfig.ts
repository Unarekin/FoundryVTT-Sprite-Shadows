import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types"
import { TokenConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultStencilShadowConfiguration, DefaultShadowConfiguration } from "settings";
import { TintFilter } from "filters";

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

    private intValue(val: unknown, defaultValue: number): number {
      const parsed = Number(val);
      if (isNaN(parsed)) return defaultValue;
      return parsed;
    }

    async _onRender(context: TokenConfigContext, options: foundry.applications.api.DocumentSheetV2.RenderOptions) {
      await super._onRender(context, options);
      this.toggleConfigSections(context.shadows.config.type);

      const typeSelect = this.element.querySelector(`select[name="sprite-shadows.type"]`);
      if (typeSelect instanceof HTMLSelectElement) {
        typeSelect.addEventListener("change", () => { this.toggleConfigSections(typeSelect.value as ShadowType); });
      }

      const originalAdjustment = { ...context.shadows.config.adjustments };
      const adjustElements = {
        x: this.element.querySelector(`[name="sprite-shadows.adjustments.x"]`) as HTMLInputElement | undefined,
        y: this.element.querySelector(`[name="sprite-shadows.adjustments.y"]`) as HTMLInputElement | undefined,
        width: this.element.querySelector(`[name="sprite-shadows.adjustments.width"]`) as HTMLInputElement | undefined,
        height: this.element.querySelector(`[name="sprite-shadows.adjustments.height"]`) as HTMLInputElement | undefined
      };

      Object.values(adjustElements).forEach(elem => {
        if (elem instanceof HTMLElement) {
          elem.addEventListener("change", () => {
            if (!this.document?.object) return;

            const currentValues = {
              x: this.intValue(adjustElements.x?.value, originalAdjustment.x),
              y: this.intValue(adjustElements.y?.value, originalAdjustment.y),
              width: this.intValue(adjustElements.width?.value, originalAdjustment.width),
              height: this.intValue(adjustElements.height?.value, originalAdjustment.height)
            }

            const delta = {
              x: currentValues.x - originalAdjustment.x,
              y: currentValues.y - originalAdjustment.y,
              width: currentValues.width - originalAdjustment.width,
              height: currentValues.height - originalAdjustment.height
            }

            originalAdjustment.x = currentValues.x;
            originalAdjustment.y = currentValues.y;
            originalAdjustment.width = currentValues.width;
            originalAdjustment.height = currentValues.height;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const stencil = ((this.document.object as any).stencilSprite) as PIXI.Sprite | undefined;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const blob = ((this.document.object as any).blobSprite) as PIXI.Sprite | undefined;

            if (stencil) {
              stencil.x += delta.x;
              stencil.y += delta.y;
              stencil.width += delta.width;
              stencil.height += delta.height;
            }

            if (blob) {
              blob.x += delta.x;
              blob.y += delta.y;
              blob.width += delta.width;
              blob.height += delta.height;
            }
          })
        }
      });


      const colorElement = this.element.querySelector(`[name="sprite-shadows.color"]`);
      if (colorElement instanceof foundry.applications.elements.HTMLColorPickerElement) {
        colorElement.addEventListener("change", () => {
          if (!this.document?.object) return;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stencil = ((this.document.object as any).stencilSprite) as PIXI.Sprite | undefined;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const blob = ((this.document.object as any).blobSprite) as PIXI.Sprite | undefined;

          if (stencil) {
            const filter = stencil.filters?.find(filter => filter instanceof TintFilter);
            if (filter) filter.color = new PIXI.Color(colorElement.value);
          }

          if (blob) {
            const filter = blob.filters?.find(filter => filter instanceof TintFilter);
            if (filter) filter.color = new PIXI.Color(colorElement.value);
          }
        })
      }

      const alphaElement = this.element.querySelector(`[name="sprite-shadows.alpha"]`);
      if (alphaElement instanceof foundry.applications.elements.HTMLRangePickerElement) {
        alphaElement.addEventListener("change", () => {
          if (!this.document?.object) return;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stencil = ((this.document.object as any).stencilSprite) as PIXI.Sprite | undefined;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const blob = ((this.document.object as any).blobSprite) as PIXI.Sprite | undefined;

          if (stencil) stencil.alpha = alphaElement.value;
          if (blob) blob.alpha = alphaElement.value;
        });
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
