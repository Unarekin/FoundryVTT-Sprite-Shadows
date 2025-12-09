import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types";
import { ShadowConfigContext } from "./types";

interface ShadowedObject {
  refreshShadow: () => void;
  blobSprite: PIXI.Sprite;
  stencilSprite: PIXI.Sprite;
}


export function ConfigMixinV1<t extends foundry.abstract.Document.Any = foundry.abstract.Document.Any>(Base: typeof foundry.appv1.api.DocumentSheet<t>) {

  abstract class ShadowedConfigV1 extends Base {
    protected abstract getFlags(): DeepPartial<ShadowConfiguration> | undefined;
    protected abstract getShadowedObject(): ShadowedObject | undefined;
    protected abstract setShadowConfiguration(config: DeepPartial<ShadowConfiguration>): Promise<ShadowConfiguration> | void;



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

    protected prepareContext(): ShadowConfigContext<any> {
      return {
        v1: true,
        shadows: {
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
      }
    }

    protected iterateElements(selector: string, fn: ((elem: HTMLElement) => void)) {
      this.element[0].querySelectorAll(selector)
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

    async _onSubmit(event: Event, options?: foundry.appv1.api.FormApplication.OnSubmitOptions): Promise<any> {
      const form = this.element.find("form")[0];
      if (form instanceof HTMLFormElement) {
        const data = foundry.utils.expandObject(new FormDataExtended(form).object) as Record<string, unknown>;
        void this.setShadowConfiguration(data["sprite-shadows"] as DeepPartial<ShadowConfiguration>);
      }
      return super._onSubmit(event, options);
    }

    activateListeners(html: JQuery<HTMLElement>): void {
      super.activateListeners(html);
      const config = this.parseFlagData(this.getConfiguration());
      const elem = html[0];
      this.toggleConfigSection(config.type);

      const typeSelect = elem.querySelector(`select[name="sprite-shadows.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => { this.toggleConfigSection(typeSelect.value as ShadowType); });


      const useImage = elem.querySelector(`[name="sprite-shadows.useImage"]`);
      if (useImage instanceof HTMLInputElement) {
        if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
        else this.hideElements(`[data-role="stencil-image-config"]`);

        useImage.addEventListener("change", () => {
          if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
          else this.hideElements(`[data-role="stencil-image-config"]`);
        })
      }
    }

    async _renderInner(data: ReturnType<this["getData"]>): Promise<JQuery<HTMLElement>> {
      const html = await super._renderInner(data);

      html
        .find(`nav.tabs`)
        .first()
        .append(
          $("<a>")
            .addClass("item")
            .attr("data-tab", "shadows")
            .append(`<i class="fa-solid fa-lightbulb"></i> ${game?.i18n?.localize("TOKEN.TABS.shadows")}`)
        )

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`, this.prepareContext());

      html.find(`.sheet-footer`).before(content);

      return html;
    }

  }

  void loadTemplates([
    `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
    `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
  ]);

  return ShadowedConfigV1;
}