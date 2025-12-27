import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types";
import { ShadowConfigContext } from "./types";
import { uploadJSON, downloadJSON } from "functions";

interface ShadowedObject {
  refreshShadow: () => void;
  blobSprite: PIXI.Sprite;
  stencilSprite: PIXI.Sprite;
}


export function ConfigMixinV1<t extends foundry.abstract.Document.Any = foundry.abstract.Document.Any>(Base: typeof foundry.appv1.api.DocumentSheet<t>) {

  abstract class ShadowedConfigV1 extends Base {
    protected abstract getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined;
    protected abstract getShadowedObject(): ShadowedObject | undefined;
    protected abstract setShadowConfiguration(config: DeepPartial<ShadowConfiguration>): Promise<ShadowConfiguration> | void;

    protected dragAdjustments = {
      x: "",
      y: "",
      width: "",
      height: ""
    };

    protected overrideFlags: DeepPartial<ShadowConfiguration> | undefined = undefined;

    protected getConfiguration(): ShadowConfiguration {
      const flags = this.overrideFlags ?? this.getShadowFlags();
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
          return foundry.utils.mergeObject(
            foundry.utils.deepClone(DefaultShadowConfiguration),
            flags ?? {}
          ) as ShadowConfiguration;
      }
    }

    protected async importFromClipboard() {
      try {
        if ((await navigator.permissions.query({ name: "clipboard-read" })).state === "granted") {
          const text = await navigator.clipboard.readText();
          if (text) {
            const data = JSON.parse(text) as ShadowConfiguration;
            ui.notifications?.info("SPRITESHADOWS.SETTINGS.IMPORT.PASTED", { localize: true });
            if (data) this.finishImport(data);
          }
        } else {
          const content = await foundry.applications.handlebars.renderTemplate(`modules/${__MODULE_ID__}/templates/PasteJSON.hbs`, {});
          const { json } = await foundry.applications.api.DialogV2.input({
            window: { title: "SPRITESHADOWS.SETTINGS.IMPORT.LABEL" },
            position: { width: 600 },
            content
          });
          if (typeof json === "string") {
            const data = JSON.parse(json) as ShadowConfiguration;
            if (data) this.finishImport(data)
          }
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }


    protected finishImport(data: ShadowConfiguration) {
      this.overrideFlags = foundry.utils.deepClone(data);
      this.render();
    }

    protected async uploadFile() {
      try {
        const data = await uploadJSON<ShadowConfiguration>();
        if (!data) return;

        this.finishImport(data);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false })
      }
    }

    protected async exportToClipboard() {
      try {
        const data = this.parseFormData();
        if ((await navigator.permissions.query({ name: "clipboard-write" })).state === "granted") {          
          console.log("Exporting:", data);
          await navigator.clipboard.writeText(JSON.stringify(data));
          ui.notifications?.info("SPRITESHADOWS.SETTINGS.EXPORT.COPIED", { localize: true });
        } else {
          const content = await foundry.applications.handlebars.renderTemplate(`modules/${__MODULE_ID__}/templates/CopyJSON.hbs`, {
            config: JSON.stringify(data, null, 2)
          });
          await foundry.applications.api.DialogV2.input({
            window: { title: "SPRITESHADOWS.SETTINGS.EXPORT.LABEL" },
            position: { width: 600 },
            content
          });
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false })
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
      const context = {
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

      if (context.shadows.config.type === "stencil")
        context.shadows.config.skew *= (180 / Math.PI);

      return context;
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

    protected parseFormData(): DeepPartial<ShadowConfiguration> | undefined {
      const form = this.element.find("form")[0];
      if (form instanceof HTMLFormElement) {
        const data = foundry.utils.expandObject(new FormDataExtended(form).object) as Record<string, unknown>;

        const formData = data["sprite-shadows"] as DeepPartial<ShadowConfiguration>;
        if (formData.type === "stencil")
          formData.skew = typeof formData.skew === "number" ? formData.skew * (Math.PI / 180) : 0;

        return formData;
      }
    }

    async _onSubmit(event: Event, options?: foundry.appv1.api.FormApplication.OnSubmitOptions): Promise<any> {
      const data = this.parseFormData();
      if (data) void this.setShadowConfiguration(data);

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

      const alphaPicker = elem.querySelector(`[name="${__MODULE_ID__}.alpha"]`);
      if (alphaPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        alphaPicker.addEventListener("input", (e: Event) => {
          //console.log("Alpha change:", (e.target as foundry.applications.elements.HTMLRangePickerElement).value);
          const alpha = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.blobSprite) obj.blobSprite.alpha = alpha;
          if (obj.stencilSprite) obj.stencilSprite.alpha = alpha;
        });
      }

      const rotationPicker = elem.querySelector(`[name="${__MODULE_ID__}.rotation"]`);
      if (rotationPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        rotationPicker.addEventListener("input", (e: Event) => {
          const angle = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.blobSprite) obj.blobSprite.angle = angle;
          if (obj.stencilSprite) obj.stencilSprite.angle = angle;
        })
      }

      const skewPicker = elem.querySelector(`[name="${__MODULE_ID__}.skew"]`);
      if (skewPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        skewPicker.addEventListener("input", (e: Event) => {
          const skew = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.stencilSprite) obj.stencilSprite.skew.x = skew * (Math.PI / 180);
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

      new ContextMenu(
        elem,
        `[data-role="import-shadows"]`,
        [
          {
            name: "SPRITESHADOWS.SETTINGS.IMPORT.CLIPBOARD",
            icon: `<i class="fa-solid fa-paste"></i>`,
            callback: () => { void this.importFromClipboard(); }
          },
          {
            name: "SPRITESHADOWS.SETTINGS.IMPORT.UPLOAD",
            icon: `<i class="fa-solid fa-upload"></i>`,
            callback: () => { void this.uploadFile() }
          }
        ],
        {
          eventName: "click"
        }
      );

      new ContextMenu(elem,
        `[data-role="export-shadows"]`,
        [
          {
            name: "SPRITESHADOWS.SETTINGS.EXPORT.CLIPBOARD",
            icon: `<i class="fa-solid fa-copy"></i>`,
            callback: () => { void this.exportToClipboard(); }
          },
          {
            name: "SPRITESHADOWS.SETTINGS.EXPORT.DOWNLOAD",
            icon: `<i class="fa-solid fa-download"></i>`,
            callback: () => {
              const data = this.parseFormData();
              if (data) downloadJSON(data, `${this.document.name}-shadows.json`);
            }
          }
        ], {
        eventName: "click"
      })


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