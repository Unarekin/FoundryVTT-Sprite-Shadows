import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { TintFilter } from "filters";


interface ShadowedObject {
  refreshShadow: () => void;
  blobSprite: PIXI.Sprite;
  stencilSprite: PIXI.Sprite;
}

export function ConfigMixin<Document extends foundry.abstract.Document.Any = foundry.abstract.Document.Any, Context extends foundry.applications.api.ApplicationV2.RenderContext = foundry.applications.api.ApplicationV2.RenderContext, Config extends foundry.applications.api.DocumentSheetV2.Configuration<Document> = foundry.applications.api.DocumentSheetV2.Configuration<Document>, Options extends foundry.applications.api.DocumentSheetV2.RenderOptions = foundry.applications.api.DocumentSheetV2.RenderOptions>(base: typeof foundry.applications.api.DocumentSheetV2<Document, Context, Config, Options>) {
  abstract class ShadowedConfig extends base {

    protected abstract getFlags(): DeepPartial<ShadowConfiguration> | undefined;
    protected abstract getShadowedObject(): ShadowedObject | undefined;

    protected abstract setShadowConfiguration(config: DeepPartial<ShadowConfiguration>): Promise<ShadowConfiguration>;

    protected getConfiguration(): ShadowConfiguration {
      const flags = this.getFlags();
      switch (flags?.type) {
        case "blob":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultBlobShadowConfiguration),
            foundry.utils.deepClone(flags)
          ) as BlobShadowConfiguration;
        case "stencil":
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultStencilShadowConfiguration),
            foundry.utils.deepClone(flags)
          ) as StencilShadowConfiguration;
        default:
          return foundry.utils.deepClone(DefaultShadowConfiguration);
      }
    }

    protected parseFlagData<t extends ShadowConfiguration = ShadowConfiguration>(data: DeepPartial<t>): t {
      const defaultValue = foundry.utils.deepClone(
        data.type === "stencil" ? DefaultStencilShadowConfiguration :
          data.type === "blob" ? DefaultBlobShadowConfiguration :
            DefaultShadowConfiguration
      ) as t;


      const newValue = foundry.utils.deepClone(data);
      // Strip null values
      const keys = Object.keys(newValue) as (keyof DeepPartial<t>)[];
      for (const key of keys) {
        if (newValue[key] === null) delete newValue[key];
      }

      foundry.utils.mergeObject(defaultValue, newValue);
      return defaultValue;
    }

    protected async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event | SubmitEvent): Promise<void> {
      // if (!this.form) return super._onSubmitForm(formConfig, event);
      const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as Record<string, unknown>;
      const formData = data["sprite-shadows"] as DeepPartial<ShadowConfiguration>;
      void this.setShadowConfiguration(formData);
      return super._onSubmitForm(formConfig, event);
    }

    protected async _prepareContext(options: DeepPartial<Options>): Promise<ShadowConfigContext<Context>> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const context = (await super._prepareContext(options as any)) as unknown as ShadowConfigContext<Context>;

      context.shadows = {
        idPrefix: foundry.utils.randomID(),
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
      return context as unknown as ShadowConfigContext<Context>
    }

    protected iterateElements(selector: string, fn: ((elem: HTMLElement) => void)) {
      this.element.querySelectorAll(selector)
        .forEach(elem => {
          if (elem instanceof HTMLElement) fn(elem);
        })
    }

    protected hideElements(selector: string) { this.iterateElements(selector, elem => elem.style.display = "none"); }
    protected showElements(selector: string) { this.iterateElements(selector, elem => elem.style.display = "block"); }

    protected toggleConfigSection(shadowType?: ShadowType) {
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
          this.hideElements(`[data-role="blob-shadow-config"],[data-role="stencil-shadow-config"]`);
      }
    }

    private intValue(val: unknown, defaultValue: number): number {
      const parsed = Number(val);
      if (isNaN(parsed)) return defaultValue;
      return parsed;
    }

    async _onRender(context: DeepPartial<ShadowConfigContext<Context>>, options: Options) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await super._onRender(context as any, options as any);

      const config = this.parseFlagData(context.shadows?.config ?? {});

      this.toggleConfigSection(config.type);

      const typeSelect = this.element.querySelector(`select[name="sprite-shadows.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => { this.toggleConfigSection(typeSelect.value as ShadowType); });

      const originalAdjustment = {
        ...config.adjustments,
        color: config.color,
        alpha: config.alpha
      };
      const adjustElements = {
        x: this.element.querySelector(`[name="sprite-shadows.adjustments.x"]`) as HTMLInputElement | undefined,
        y: this.element.querySelector(`[name="sprite-shadows.adjustments.y"]`) as HTMLInputElement | undefined,
        width: this.element.querySelector(`[name="sprite-shadows.adjustments.width"]`) as HTMLInputElement | undefined,
        height: this.element.querySelector(`[name="sprite-shadows.adjustments.height"]`) as HTMLInputElement | undefined,
        color: this.element.querySelector(`[name="sprite-shadows.color"]`) as foundry.applications.elements.HTMLColorPickerElement | undefined,
        alpha: this.element.querySelector(`[name="sprite-shadows.alpha"]`) as foundry.applications.elements.HTMLRangePickerElement | undefined
      };


      Object.values(adjustElements).forEach(elem => {
        if (elem instanceof HTMLElement) {
          elem.addEventListener("change", () => {
            const shadowedObject = this.getShadowedObject();
            if (!shadowedObject) return;

            const currentValues = {
              x: this.intValue(adjustElements.x?.value, originalAdjustment.x),
              y: this.intValue(adjustElements.y?.value, originalAdjustment.y),
              width: this.intValue(adjustElements.width?.value, originalAdjustment.width),
              height: this.intValue(adjustElements.height?.value, originalAdjustment.height),
              color: adjustElements.color?.value ?? originalAdjustment.color,
              alpha: this.intValue(adjustElements.alpha?.value, originalAdjustment.alpha)
            }

            const delta = {
              x: currentValues.x - originalAdjustment.x,
              y: currentValues.y - originalAdjustment.y,
              width: currentValues.width - originalAdjustment.width,
              height: currentValues.height - originalAdjustment.height,
            }

            originalAdjustment.x = currentValues.x;
            originalAdjustment.y = currentValues.y;
            originalAdjustment.width = currentValues.width;
            originalAdjustment.height = currentValues.height;

            const stencil = shadowedObject.stencilSprite
            const blob = shadowedObject.blobSprite

            if (stencil) {
              stencil.x += delta.x;
              stencil.y += delta.y;
              stencil.width += delta.width;
              stencil.height += delta.height;

              stencil.alpha = currentValues.alpha;

              const filter = stencil.filters?.find(filter => filter instanceof TintFilter);
              if (filter) filter.color = new PIXI.Color(currentValues.color);
            }

            if (blob) {
              blob.x += delta.x;
              blob.y += delta.y;
              blob.width += delta.width;
              blob.height += delta.height;

              blob.alpha = currentValues.alpha;

              const filter = blob.filters?.find(filter => filter instanceof TintFilter);
              if (filter) filter.color = new PIXI.Color(currentValues.color);
            }
          })
        }
      });



    }
  }

  return ShadowedConfig;
}