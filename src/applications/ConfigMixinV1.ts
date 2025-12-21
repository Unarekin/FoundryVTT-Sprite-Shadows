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

    protected dragAdjustments = {
      x: "",
      y: "",
      width: "",
      height: ""
    };


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
          },
          adjustPosTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustPosition.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGPOS")}</p></div>`,
          adjustSizeTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustSize.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGSIZE")}</p></div>`,
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

    protected _dragAdjustMouseUp = (() => {
      this.dragAdjustments.x = this.dragAdjustments.y = this.dragAdjustments.width = this.dragAdjustments.height = "";
    }).bind(this);

    protected applyDragAdjustment(selector: string, delta: number) {
      const elem = this.element[0].querySelector(selector);
      if (elem instanceof HTMLInputElement) {
        elem.value = (parseFloat(elem.value) + delta).toString();
        elem.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    protected _dragAdjustMouseMove = ((e: MouseEvent) => {
      if (this.dragAdjustments.x)
        this.applyDragAdjustment(this.dragAdjustments.x, e.movementX);
      if (this.dragAdjustments.y)
        this.applyDragAdjustment(this.dragAdjustments.y, e.movementY);
      if (this.dragAdjustments.width)
        this.applyDragAdjustment(this.dragAdjustments.width, e.movementX);
      if (this.dragAdjustments.height)
        this.applyDragAdjustment(this.dragAdjustments.height, -e.movementY);
    }).bind(this);

    activateListeners(html: JQuery<HTMLElement>): void {
      super.activateListeners(html);
      const config = this.parseFlagData(this.getConfiguration());
      const elem = html[0];
      this.toggleConfigSection(config.type);

      const typeSelect = elem.querySelector(`select[name="${__MODULE_ID__}.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => { this.toggleConfigSection(typeSelect.value as ShadowType); });

      const dragPos = elem.querySelector(`[data-role="drag-pos"]`);
      if (dragPos instanceof HTMLButtonElement) {
        dragPos.addEventListener("mousedown", () => {
          this.dragAdjustments.x = `[name="${__MODULE_ID__}.adjustments.x"]`
          this.dragAdjustments.y = `[name="${__MODULE_ID__}.adjustments.y"]`
          this.dragAdjustments.width = this.dragAdjustments.height = "";
        })
      }

      const dragSize = elem.querySelector(`[data-role="drag-size"]`);
      if (dragSize instanceof HTMLButtonElement) {
        dragSize.addEventListener("mousedown", () => {
          this.dragAdjustments.x = this.dragAdjustments.y = "";
          this.dragAdjustments.width = `[name="${__MODULE_ID__}.adjustments.width"]`;
          this.dragAdjustments.height = `[name="${__MODULE_ID__}.adjustments.height"]`;
        })
      }

      const adjustElems = elem.querySelectorAll(["x", "y", "width", "height"].map(item => `[name="${__MODULE_ID__}.adjustments.${item}"]`).join(","));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const originalAdjustments = (foundry.utils.expandObject(new FormDataExtended(this.form).object))["sprite-shadows"].adjustments as { x: number, y: number, width: number, height: number };
      for (const element of adjustElems) {
        element.addEventListener("change", () => {
          const obj = this.getShadowedObject()
          if (!obj) return;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const formData = foundry.utils.expandObject(new FormDataExtended(this.form).object)["sprite-shadows"].adjustments as { x: number, y: number, width: number, height: number };
          const deltas = {
            x: formData.x - originalAdjustments.x,
            y: formData.y - originalAdjustments.y,
            width: formData.width - originalAdjustments.width,
            height: formData.height - originalAdjustments.height
          };

          if (obj.blobSprite) {
            obj.blobSprite.x += deltas.x;
            obj.blobSprite.y += deltas.y;
            obj.blobSprite.width += deltas.width;
            obj.blobSprite.height += deltas.height;
          }

          if (obj.stencilSprite) {
            obj.stencilSprite.x += deltas.x;
            obj.stencilSprite.y += deltas.y;
            obj.stencilSprite.width += deltas.width;
            obj.stencilSprite.height += deltas.height;
          }

          originalAdjustments.x = formData.x;
          originalAdjustments.y = formData.y;
          originalAdjustments.width = formData.width;
          originalAdjustments.height = formData.height;
        })
      }


      const useImage = elem.querySelector(`[name="sprite-shadows.useImage"]`);
      if (useImage instanceof HTMLInputElement) {
        if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
        else this.hideElements(`[data-role="stencil-image-config"]`);

        useImage.addEventListener("change", () => {
          if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
          else this.hideElements(`[data-role="stencil-image-config"]`);
        })
      }

      window.removeEventListener("mousemove", this._dragAdjustMouseMove);
      window.removeEventListener("mouseup", this._dragAdjustMouseUp);
      window.addEventListener("mousemove", this._dragAdjustMouseMove);
      window.addEventListener("mouseup", this._dragAdjustMouseUp);
    }

    async close(options: foundry.appv1.api.FormApplication.CloseOptions) {
      window.removeEventListener("mousemove", this._dragAdjustMouseMove);
      window.removeEventListener("mouseup", this._dragAdjustMouseUp);
      await super.close(options)
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