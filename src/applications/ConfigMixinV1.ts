import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { BlobShadowConfiguration, DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types";
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
    protected abstract setShadowConfiguration(config: DeepPartial<ShadowConfiguration>): Promise<void>;
    protected abstract loadShadowConfigSettings(source: ShadowConfigSource): void;

    protected shadowDragAdjustments = {
      x: "",
      y: "",
      width: "",
      height: ""
    };

    protected overrideShadowFlags: DeepPartial<ShadowConfiguration> | undefined = undefined;
    protected overrideShadowConfigSource: ShadowConfigSource | undefined = undefined;

    protected getConfiguration(): ShadowConfiguration {
      const flags = this.overrideShadowFlags ?? this.getShadowFlags();
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


    protected toggleSceneSource(enabled: boolean) {
      const tab = this.element[0].querySelector(`div.tab.sprite-shadows-config`);
      if (!(tab instanceof HTMLElement)) return;
      const elements = Array.from<HTMLElement>(tab.querySelectorAll(`input, select:not([name="sprite-shadows.configSource"]), range-picker, color-picker, button`));
      for (const elem of elements) {
        if (elem instanceof HTMLButtonElement) {
          elem.disabled = !enabled;
        } else {
          if (enabled) elem.removeAttribute("disabled")
          else elem.setAttribute("disabled", "disabled");
        }
      }
    }

    protected finishImport(data: ShadowConfiguration) {
      this.overrideShadowFlags = foundry.utils.deepClone(data);
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
      const context: ShadowConfigContext<Record<string, unknown>> = {
        v1: true,
        shadows: {
          idPrefix: foundry.utils.randomID(),
          config: foundry.utils.deepClone(this.getConfiguration()),
          allowConfigSource: false,
          configSource: this.overrideShadowConfigSource,
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
          configSourceSelect: {
            actor: "DOCUMENT.Actor",
            token: "DOCUMENT.Token",
            scene: "DOCUMENT.Scene",
            global: "SPRITESHADOWS.SETTINGS.SOURCE.GLOBAL"
          },
          adjustPosTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustPosition.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGPOS")}</p></div>`,
          adjustSizeTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustSize.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGSIZE")}</p></div>`,
          tabs: {
            basics: {
              id: "basics",
              group: "shadows",
              active: true,
              cssClass: "",
              icon: "fa-solid fa-cog",
              label: "SPRITESHADOWS.SETTINGS.TABS.BASICS"
            }
          }
        }
      }

      if (context.shadows.config.type === "blob") {
        context.shadows.tabs.blob = {
          id: "blob",
          group: "shadows",
          label: "SPRITESHADOWS.SETTINGS.TABS.BLOB",
          active: false,
          cssClass: "",
          icon: "fa-solid fa-lightbulb"
        };
      } else if (context.shadows.config.type === "stencil") {
        context.shadows.tabs.stencil = {
          id: "stencil",
          group: "shadows",
          label: "SPRITESHADOWS.SETTINGS.TABS.STENCIL",
          active: false,
          cssClass: "",
          icon: "fa-solid fa-lightbulb"
        };
      }

      if (context.shadows.config.type === "stencil") {
        context.shadows.config.shadows.forEach(shadow => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (shadow as any).label = shadow.id;
        })
      }

      // if (context.shadows.config.type === "stencil")
      //   context.shadows.config.skew *= (180 / Math.PI);

      // TODO: Reimplement for multiple stencil sprites
      // const adjustmentMultiplier = this.getShadowDragAdjustmentMultiplier();
      // context.shadows.config.adjustments.x *= 1 / adjustmentMultiplier.x;
      // context.shadows.config.adjustments.y *= 1 / adjustmentMultiplier.y;
      // context.shadows.config.adjustments.width *= 1 / adjustmentMultiplier.width;
      // context.shadows.config.adjustments.height *= 1 / adjustmentMultiplier.height;

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

        // TODO: Reimplement for multiple stencil sprites
        // if (formData.type === "stencil")
        //   formData.skew = typeof formData.skew === "number" ? formData.skew * (Math.PI / 180) : 0;

        // const adjustmentMultiplier = this.getShadowDragAdjustmentMultiplier();

        // if (typeof formData.adjustments?.x === "number") formData.adjustments.x *= adjustmentMultiplier.x;
        // if (typeof formData.adjustments?.y === "number") formData.adjustments.y *= adjustmentMultiplier.y;
        // if (typeof formData.adjustments?.width === "number") formData.adjustments.width *= adjustmentMultiplier.width;
        // if (typeof formData.adjustments?.height === "number") formData.adjustments.height *= adjustmentMultiplier.height;

        return formData;
      }
    }

    async _onSubmit(event: Event, options?: foundry.appv1.api.FormApplication.OnSubmitOptions): Promise<any> {
      const data = this.parseFormData();
      if (data) void this.setShadowConfiguration(data);

      return super._onSubmit(event, options);
    }

    protected _shadowDragAdjustMouseUp = (() => {
      this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
    }).bind(this);

    protected getShadowDragAdjustmentMultiplier() { return { x: 1, y: 1, width: 1, height: 1 }; }

    protected applyShadowDragAdjustment(selector: string, delta: number) {
      const elem = this.element[0].querySelector(selector);
      if (elem instanceof HTMLInputElement) {
        elem.value = Math.floor((parseFloat(elem.value) + delta)).toString();
        elem.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    protected _shadowDragAdjustMouseMove = ((e: MouseEvent) => {
      const multiplier = this.getShadowDragAdjustmentMultiplier();
      if (this.shadowDragAdjustments.x)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.x, e.movementX * multiplier.x);
      if (this.shadowDragAdjustments.y)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.y, e.movementY * multiplier.y);
      if (this.shadowDragAdjustments.width)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.width, e.movementX * multiplier.width);
      if (this.shadowDragAdjustments.height)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.height, -e.movementY * multiplier.height);
    }).bind(this);

    activateListeners(html: JQuery<HTMLElement>): void {
      super.activateListeners(html);
      const config = this.parseFlagData(this.getConfiguration());
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const context = this.prepareContext();
      const elem = html[0];
      this.toggleConfigSection(config.type);

      const configSourceElem = elem.querySelector(`[name="sprite-shadows.configSource"]`);

      if (configSourceElem instanceof HTMLSelectElement) {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.toggleSceneSource(context.shadows?.configSource !== "scene" && context.shadows?.configSource !== "global");
        configSourceElem.addEventListener("change", () => {
          this.loadShadowConfigSettings(configSourceElem.value as ShadowConfigSource);
        })
      }

      const typeSelect = elem.querySelector(`select[name="${__MODULE_ID__}.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => { this.toggleConfigSection(typeSelect.value as ShadowType); });

      const dragPos = elem.querySelector(`[data-role="shadow-drag-pos"]`);
      if (dragPos instanceof HTMLButtonElement) {
        dragPos.addEventListener("mousedown", () => {
          this.shadowDragAdjustments.x = `[name="${__MODULE_ID__}.adjustments.x"]`
          this.shadowDragAdjustments.y = `[name="${__MODULE_ID__}.adjustments.y"]`
          this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
        })
      }

      const dragSize = elem.querySelector(`[data-role="shadow-drag-size"]`);
      if (dragSize instanceof HTMLButtonElement) {
        dragSize.addEventListener("mousedown", () => {
          this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = "";
          this.shadowDragAdjustments.width = `[name="${__MODULE_ID__}.adjustments.width"]`;
          this.shadowDragAdjustments.height = `[name="${__MODULE_ID__}.adjustments.height"]`;
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

      const tabs = new Tabs({
        group: "shadows",
        navSelector: `.tabs[data-group="shadows"]`,
        contentSelector: `.tab[data-group="shadows"]`,
        initial: "basics",
        callback: (...args: unknown[]) => {
          console.log("Activated tab:", args);
        }
      });
      tabs.bind(html[0]);
      if (!this._tabs.find(tab => tab.group === "shadows"))
        this._tabs.push(tabs);

      window.removeEventListener("mousemove", this._shadowDragAdjustMouseMove);
      window.removeEventListener("mouseup", this._shadowDragAdjustMouseUp);
      window.addEventListener("mousemove", this._shadowDragAdjustMouseMove);
      window.addEventListener("mouseup", this._shadowDragAdjustMouseUp);
    }

    async close(options: foundry.appv1.api.FormApplication.CloseOptions) {
      window.removeEventListener("mousemove", this._shadowDragAdjustMouseMove);
      window.removeEventListener("mouseup", this._shadowDragAdjustMouseUp);
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
      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/config/tabsv1.hbs`, this.prepareContext());

      html.find(`.sheet-footer`).before(content);

      return html;
    }

    constructor(obj: any, options?: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super(obj, options);

      // // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      // this._tabs.push({
      //   active: "basics",
      //   group: "shadows",
      //   _navSelector: `.tabs[data-group="shadows"]`,
      //   _contentSelector: `.tab[data-group="shadows"]`,
      // } as any);
    }

  }

  void loadTemplates([
    `modules/${__MODULE_ID__}/templates/config/basics.hbs`,
    `modules/${__MODULE_ID__}/templates/config/blobSettings.hbs`,
    `modules/${__MODULE_ID__}/templates/config/stencilSettings.hbs`
  ]);

  return ShadowedConfigV1;
}