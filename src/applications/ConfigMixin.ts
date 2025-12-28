import { BlobShadowConfiguration, DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { TintFilter } from "filters";
import { downloadJSON, uploadJSON } from "functions";


interface ShadowedObject {
  refreshShadow: () => void;
  blobSprite: PIXI.Sprite;
  stencilSprite: PIXI.Sprite;
}

export function ConfigMixin<Document extends foundry.abstract.Document.Any = foundry.abstract.Document.Any, Context extends foundry.applications.api.ApplicationV2.RenderContext = foundry.applications.api.ApplicationV2.RenderContext, Config extends foundry.applications.api.DocumentSheetV2.Configuration<Document> = foundry.applications.api.DocumentSheetV2.Configuration<Document>, Options extends foundry.applications.api.DocumentSheetV2.RenderOptions = foundry.applications.api.DocumentSheetV2.RenderOptions>(base: typeof foundry.applications.api.DocumentSheetV2<Document, Context, Config, Options>) {
  abstract class ShadowedConfig extends base {

    protected dragAdjustments = {
      x: "",
      y: "",
      width: "",
      height: ""
    };

    protected overrideFlags: DeepPartial<ShadowConfiguration> | undefined = undefined;

    protected abstract getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined;
    protected abstract getShadowedObject(): ShadowedObject | undefined;

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
            flags ? foundry.utils.deepClone(flags) : {}
          ) as ShadowConfiguration;
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



    protected _dragAdjustMouseUp = (() => {
      this.dragAdjustments.x = this.dragAdjustments.y = this.dragAdjustments.width = this.dragAdjustments.height = "";
    }).bind(this);


    protected applyDragAdjustment(selector: string, delta: number) {
      const elem = this.element.querySelector(selector);
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

    protected parseShadowFormData(): DeepPartial<ShadowConfiguration> {
      const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as Record<string, unknown>;
      const formData = data["sprite-shadows"] as DeepPartial<ShadowConfiguration>;

      if (formData.type === "stencil")
        formData.skew = typeof formData.skew === "number" ? formData.skew * (Math.PI / 180) : 0;
      return formData;      
    }

    protected async _prepareContext(options: DeepPartial<Options>): Promise<ShadowConfigContext<Context>> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const context = (await super._prepareContext(options as any)) as unknown as ShadowConfigContext<Context>;

      const flags = this.getConfiguration();
      this.overrideFlags ??= flags;

      context.shadows = {
        idPrefix: foundry.utils.randomID(),
        config: flags,
        allowTokenOverride: false,
        spriteAnimations: game.modules?.get("sprite-animations")?.active ?? false,
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
      // Convert skew to degrees
      if (context.shadows.config.type === "stencil")
        context.shadows.config.skew *= (180 / Math.PI);

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

    _onClose(options: any) {
      window.removeEventListener("mousemove", this._dragAdjustMouseMove);
      window.removeEventListener("mouseup", this._dragAdjustMouseUp)
      this.overrideFlags = undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super._onClose(options);
    }

    protected previousFormData: DeepPartial<ShadowConfiguration> = this.getShadowFlags() ?? {};

    protected applyFormChanges(changes: ShadowConfiguration, sprite: PIXI.Sprite, shadowType: ShadowType) {
      sprite.alpha = changes.alpha;


      const tintFilter = sprite.filters?.find(filter => filter instanceof TintFilter);
      if (tintFilter) tintFilter.color = new PIXI.Color(changes.color ?? "black");

      const blurFilter = sprite.filters?.find(filter => filter instanceof PIXI.filters.BlurFilter);
      if (blurFilter) blurFilter.blur = changes.blur;

      sprite.x += changes.adjustments.x - (this.previousFormData.adjustments?.x ?? 0);
      sprite.y -= (this.previousFormData.adjustments?.y ?? 0) - changes.adjustments.y;
      sprite.width += changes.adjustments.width - (this.previousFormData.adjustments?.width ?? 0);
      sprite.height -= (this.previousFormData.adjustments?.height ?? 0) - changes.adjustments.height;

      if (shadowType === "stencil") {
        sprite.skew.x = (changes as StencilShadowConfiguration).skew * (Math.PI / 180);
      }

      sprite.angle = changes.rotation;
    }

    _onChangeForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event) {
      super._onChangeForm(formConfig, event);

      const shadowedObj = this.getShadowedObject();
      if (!shadowedObj) return;

      if (!this.form) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const formData = (foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as any)[__MODULE_ID__] as ShadowConfiguration;

      if (shadowedObj.blobSprite) {
        shadowedObj.blobSprite.visible = formData.type === "blob";
        this.applyFormChanges(formData, shadowedObj.blobSprite, "blob");
      }

      if (shadowedObj.stencilSprite) {
        shadowedObj.stencilSprite.visible = formData.type === "stencil";
        this.applyFormChanges(formData, shadowedObj.stencilSprite, "stencil");
      }

      this.previousFormData = foundry.utils.deepClone(formData);
      this.overrideFlags = foundry.utils.deepClone(formData);
    }

    protected async finishImport(data: ShadowConfiguration) {
      this.overrideFlags = foundry.utils.deepClone(data);
      await this.render();
    }

    protected async uploadFile() {
      try {
        const data = await uploadJSON<ShadowConfiguration>();
        if (!data) return;

        await this.finishImport(data);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false })
      }
    }

    protected async importFromClipboard() {
      try {
        if ((await navigator.permissions.query({ name: "clipboard-read" })).state === "granted") {
          const text = await navigator.clipboard.readText();
          if (text) {
            const data = JSON.parse(text) as ShadowConfiguration;
            ui.notifications?.info("SPRITESHADOWS.SETTINGS.IMPORT.PASTED", { localize: true });
            if (data) await this.finishImport(data);
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
            if (data) await this.finishImport(data)
          }
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }

    protected async exportToClipboard() {
      try {
        if ((await navigator.permissions.query({ name: "clipboard-write" })).state === "granted") {
          await navigator.clipboard.writeText(JSON.stringify(this.overrideFlags));
          ui.notifications?.info("SPRITESHADOWS.SETTINGS.EXPORT.COPIED", { localize: true });
        } else {
          const content = await foundry.applications.handlebars.renderTemplate(`modules/${__MODULE_ID__}/templates/CopyJSON.hbs`, {
            config: JSON.stringify(this.overrideFlags, null, 2)
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

    async _onFirstRender(context: DeepPartial<ShadowConfigContext<Context>>, options: Options) {
      await super._onFirstRender(context, options);
      window.addEventListener("mousemove", this._dragAdjustMouseMove);
      window.addEventListener("mouseup", this._dragAdjustMouseUp);
    }

    async _onRender(context: DeepPartial<ShadowConfigContext<Context>>, options: Options) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await super._onRender(context as any, options as any);

      const config = this.parseFlagData(context.shadows?.config ?? {});

      this.toggleConfigSection(config.type);

      const dragPos = this.element.querySelector(`[data-role="drag-pos"]`);
      if (dragPos instanceof HTMLButtonElement) {
        dragPos.addEventListener("mousedown", () => {
          this.dragAdjustments.x = `[name="${__MODULE_ID__}.adjustments.x"]`
          this.dragAdjustments.y = `[name="${__MODULE_ID__}.adjustments.y"]`
          this.dragAdjustments.width = this.dragAdjustments.height = "";
        });
      }

      const dragSize = this.element.querySelector(`[data-role="drag-size"]`);
      if (dragSize instanceof HTMLButtonElement) {
        dragSize.addEventListener("mousedown", () => {
          this.dragAdjustments.x = this.dragAdjustments.y = "";
          this.dragAdjustments.width = `[name="${__MODULE_ID__}.adjustments.width"]`;
          this.dragAdjustments.height = `[name="${__MODULE_ID__}.adjustments.height"]`;
        })
      }

      const alphaPicker = this.element.querySelector(`[name="${__MODULE_ID__}.alpha"]`);
      if (alphaPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        alphaPicker.addEventListener("input", (e: Event) => {
          const alpha = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.blobSprite) obj.blobSprite.alpha = alpha;
          if (obj.stencilSprite) obj.stencilSprite.alpha = alpha;
        });
      }

      const rotationPicker = this.element.querySelector(`[name="${__MODULE_ID__}.rotation"]`);
      if (rotationPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        rotationPicker.addEventListener("input", (e: Event) => {
          const angle = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.blobSprite) obj.blobSprite.angle = angle;
          if (obj.stencilSprite) obj.stencilSprite.angle = angle;
        })
      }

      const skewPicker = this.element.querySelector(`[name="${__MODULE_ID__}.skew"]`);
      if (skewPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        skewPicker.addEventListener("input", (e: Event) => {
          const skew = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (!obj) return;
          if (obj.stencilSprite) obj.stencilSprite.skew.x = skew * (Math.PI / 180);
        })
      }

      const typeSelect = this.element.querySelector(`select[name="${__MODULE_ID__}.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => { this.toggleConfigSection(typeSelect.value as ShadowType); });

      const useImage = this.element.querySelector(`[name="${__MODULE_ID__}.useImage"]`);
      if (useImage instanceof HTMLInputElement) {
        if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
        else this.hideElements(`[data-role="stencil-image-config"]`);

        useImage.addEventListener("change", () => {
          if (useImage.checked) this.showElements(`[data-role="stencil-image-config"]`);
          else this.hideElements(`[data-role="stencil-image-config"]`);
        })
      }

      // Set up context menus
      new foundry.applications.ux.ContextMenu(
        this.element,
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
          jQuery: false,
          eventName: "click",
          fixed: true
        }
      );

      new foundry.applications.ux.ContextMenu(
        this.element,
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
            callback: () => { downloadJSON(this.overrideFlags as object, "shadows.json"); }
          }
        ],
        {
          jQuery: false,
          eventName: "click",
          fixed: true
        }
      )

    }
  }

  return ShadowedConfig;
}