import { BlobShadowConfiguration, DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowType, StencilShadowConfiguration, ShadowedObject, MeshAdjustments } from "types";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadow, DefaultStencilShadowConfiguration } from "settings";
import { contrastColor, downloadJSON, findBottomAnchorPoint, findCentralAnchorPoint, uploadJSON } from "functions";
import { StencilShadowConfig } from "./StencilShadowConfig";




export function ConfigMixin<Document extends foundry.abstract.Document.Any = foundry.abstract.Document.Any, Context extends foundry.applications.api.ApplicationV2.RenderContext = foundry.applications.api.ApplicationV2.RenderContext, Config extends foundry.applications.api.DocumentSheetV2.Configuration<Document> = foundry.applications.api.DocumentSheetV2.Configuration<Document>, Options extends foundry.applications.api.DocumentSheetV2.RenderOptions = foundry.applications.api.DocumentSheetV2.RenderOptions>(base: typeof foundry.applications.api.DocumentSheetV2<Document, Context, Config, Options>) {
  abstract class ShadowedConfig extends base {

    #previousBlobDragAdjustments: { x: number, y: number, width: number, height: number } | undefined = undefined;

    public static DEFAULT_OPTIONS = {
      ...base.DEFAULT_OPTIONS,
      actions: {
        ...(base.DEFAULT_OPTIONS.actions ?? {}),
        // eslint-disable-next-line @typescript-eslint/unbound-method
        autoSetShadowAnchor: ShadowedConfig.AutoSetAnchor,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        removeStencilShadow: ShadowedConfig.RemoveStencilShadow,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        editStencilShadow: ShadowedConfig.EditStencilShadow,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        addStencilShadow: ShadowedConfig.AddStencilShadow
      }
    }


    public static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...(base as any).PARTS as Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart>,
      shadows: {
        template: `modules/${__MODULE_ID__}/templates/config/tabs.hbs`,
        scrollable: ['.scrollable'],
        templates: [
          `modules/${__MODULE_ID__}/templates/config/basics.hbs`,
          `modules/${__MODULE_ID__}/templates/config/blobSettings.hbs`,
          `modules/${__MODULE_ID__}/templates/config/stencilSettings.hbs`
        ]
      }
    }

    public static TABS: Record<string, foundry.applications.api.ApplicationV2.TabsConfiguration> = {
      ...base.TABS,
      sheet: {
        ...base.TABS.sheet,
        tabs: [
          ...base.TABS.sheet.tabs,
          {
            id: "shadows",
            cssClass: "",
            icon: "fa-solid fa-lightbulb"
          }
        ]
      }
    }

    protected shadowDragAdjustments = {
      x: "",
      y: "",
      width: "",
      height: ""
    };

    protected outlineFilters: PIXI.Filter[] = [];

    protected overrideShadowFlags: DeepPartial<ShadowConfiguration> | undefined = undefined;
    protected overrideShadowConfigSource: ShadowConfigSource | undefined = undefined;

    protected abstract getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined;
    protected abstract getShadowedObject(): ShadowedObject | undefined;
    protected abstract loadShadowConfigSettings(source: ShadowConfigSource): Promise<void>;
    protected abstract getOriginalShadowedObject(): foundry.canvas.placeables.PlaceableObject | undefined;

    static async AddStencilShadow(this: ShadowedConfig) {
      try {
        const obj = this.getShadowedObject();
        let sprite: PIXI.Sprite | undefined = undefined;
        const shadowConfig = foundry.utils.deepClone(DefaultStencilShadow);
        if (obj) {
          shadowConfig.id = foundry.utils.randomID();
          sprite = obj.createStencilShadowSprite(shadowConfig);
          if (sprite && obj.mesh) {
            obj.setStencilShadowConfig(sprite, shadowConfig, obj.mesh);
          }
        }
        const data = await StencilShadowConfig.Edit(shadowConfig, sprite);


        if (data && this.overrideShadowFlags?.type === "stencil") {
          if (Array.isArray(this.overrideShadowFlags.shadows)) this.overrideShadowFlags.shadows.push(foundry.utils.deepClone(data));
          else this.overrideShadowFlags.shadows = [foundry.utils.deepClone(data)];
          if (obj && sprite) obj.stencilSprites.push(sprite);
        } else {
          sprite?.destroy();
        }
        await this.render();
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }

    static async EditStencilShadow(this: ShadowedConfig, e: Event, elem: HTMLElement) {
      try {
        if (this.overrideShadowFlags?.type !== "stencil") return console.warn("No shadow flags stored");
        if (!Array.isArray(this.overrideShadowFlags.shadows)) return console.warn("No shadows on flags");

        if (!elem.dataset.shadow) return console.warn("No shadow ID");
        const shadowId = elem.dataset.shadow;
        const shadowConfig = this.overrideShadowFlags.shadows.find(item => item.id === shadowId);
        if (!shadowConfig) return console.warn("No shadow config found");

        const obj = this.getShadowedObject();
        const sprite: PIXI.Sprite | undefined = obj?.stencilSprites?.find(sprite => sprite.name === `StencilShadow.${shadowId}`);
        const data = await StencilShadowConfig.Edit(shadowConfig, sprite);
        if (data) {
          // empty
          const index = this.overrideShadowFlags.shadows.findIndex(item => item.id === data.id);
          if (index !== -1) this.overrideShadowFlags.shadows[index] = foundry.utils.mergeObject(foundry.utils.deepClone(DefaultStencilShadowConfiguration), data)
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }


    static async RemoveStencilShadow(this: ShadowedConfig, e: Event, elem: HTMLElement) {
      try {
        if (this.overrideShadowFlags?.type !== "stencil") return console.warn("overrideShadowFlags.type is not stencil");
        if (!this.overrideShadowFlags?.shadows) return console.warn("No shadows on overrideShadowFlags");

        const shadowId = elem.dataset.shadow;
        if (!shadowId) return console.warn("No shadow ID on HTML element");

        const config = this.overrideShadowFlags.shadows.find(elem => elem.id === shadowId);
        if (!config) return console.warn(`Could not find config with id ${shadowId}`);

        const confirmed = (await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n?.localize("SPRITESHADOWS.SETTINGS.REMOVE.TITLE") ?? "" },
          content: game.i18n?.format("SPRITESHADOWS.SETTINGS.REMOVE.MESSAGE", { name: config.id })
        })) as boolean;
        if (!confirmed) return console.warn("Removal canceled");

        const index = this.overrideShadowFlags.shadows.findIndex(elem => elem.id === shadowId);
        if (index !== -1) this.overrideShadowFlags.shadows.splice(index, 1);
        else console.warn("Config not found in overrideShadowFlags")

        const obj = this.getShadowedObject();
        if (obj) {
          const index = (obj.stencilSprites ?? []).findIndex(sprite => sprite.name === `StencilShadow.${shadowId}`);
          if (index !== -1) {
            const sprite = obj.stencilSprites[index];
            console.log("Removing", sprite);
            obj.stencilSprites.splice(index, 1);
            sprite.destroy();
          }
        } else {
          console.warn("No shadowed object found");
        }

        await this.render();
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }

    static AutoSetAnchor(this: ShadowedConfig) {
      try {
        const shadowedObj = this.getShadowedObject();
        if (!shadowedObj) return;

        const flags = this.overrideShadowFlags ?? this.getShadowFlags();
        if (!flags) return;

        if (flags.type === "blob" && !shadowedObj.blobSprite) return;
        if (flags.type === "stencil" && !shadowedObj.stencilSprites?.length) return;

        if (flags.type === "blob") {
          const shadowTexture = shadowedObj.blobSprite.texture;
          const anchor = flags.alignment === "bottom" ? findBottomAnchorPoint(shadowTexture) : findCentralAnchorPoint(shadowTexture);
          if (!anchor) return;


          // this.overrideShadowFlags.adjustments.anchor.x = anchor?.x;
          // this.overrideShadowFlags.adjustments.anchor.y = anchor?.y;

          this.setFormElementValue(`[name="sprite-shadows.adjustments.anchor.x"]`, anchor.x.toString(), false);
          this.setFormElementValue(`[name="sprite-shadows.adjustments.anchor.y"]`, anchor.y.toString());
        } else if (flags.type === "stencil") {
          if (flags.shadows) {
            for (let i = 0; i < flags.shadows?.length; i++) {
              const shadowSprite = shadowedObj.stencilSprites[i];
              if (!shadowSprite) break;

              const shadowConfig = flags.shadows[i];
              const anchor = shadowConfig.alignment === "bottom" ? findBottomAnchorPoint(shadowSprite.texture) : findCentralAnchorPoint(shadowSprite.texture);
              if (!anchor) return;

              shadowConfig.adjustments.anchor.x = anchor.x;
              shadowConfig.adjustments.anchor.y = anchor.y;
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
      }
    }

    protected setFormElementValue(selector: string, value: string, dispatchEvent = true) {
      const elem = this.element.querySelector(selector);
      if (!(elem instanceof HTMLInputElement)) return;
      elem.value = value;
      if (dispatchEvent)
        elem.dispatchEvent(new Event("change", { bubbles: true }));
    }

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



    protected _shadowDragAdjustMouseUp = (() => {
      this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
    }).bind(this);


    protected applyShadowDragAdjustment(selector: string, delta: number) {
      const elem = this.element.querySelector(selector);
      if (elem instanceof HTMLInputElement)
        this.setFormElementValue(selector, Math.floor((parseFloat(elem.value) + delta)).toString());
      this.applyShadowDragAdjustmentPreview();
    }

    protected applyShadowDragAdjustmentPreview() {
      const data = this.parseShadowFormData();
      if (!data) return;

      if (data.type === "blob") {
        const sprite = this.getShadowedObject()?.blobSprite;
        if (sprite) {
          const adjustments = {
            x: data.adjustments?.x ?? 0,
            y: data.adjustments?.y ?? 0,
            width: data.adjustments?.width ?? 0,
            height: data.adjustments?.height ?? 0
          }
          const delta = {
            x: adjustments.x - (this.#previousBlobDragAdjustments?.x ?? 0),
            y: adjustments.y - (this.#previousBlobDragAdjustments?.y ?? 0),
            width: adjustments.width - (this.#previousBlobDragAdjustments?.width ?? 0),
            height: adjustments.height - (this.#previousBlobDragAdjustments?.height ?? 0)
          };
          sprite.x += delta.x;
          sprite.y += delta.y;
          sprite.width += delta.width;
          sprite.height += delta.height;
          this.#previousBlobDragAdjustments = adjustments;
        }
      }
    }

    protected _shadowDragAdjustMouseMove = ((e: MouseEvent) => {
      if (this.shadowDragAdjustments.x)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.x, e.movementX);
      if (this.shadowDragAdjustments.y)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.y, e.movementY);
      if (this.shadowDragAdjustments.width)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.width, e.movementX);
      if (this.shadowDragAdjustments.height)
        this.applyShadowDragAdjustment(this.shadowDragAdjustments.height, -e.movementY);
    }).bind(this);

    protected getDragAdjustmentMultiplier() { return { x: 1, y: 1, width: 1, height: 1 }; }

    protected parseShadowFormData(): DeepPartial<ShadowConfiguration> {
      if (!this.form) return {};
      const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as Record<string, unknown>;

      const formData = data["sprite-shadows"] as DeepPartial<ShadowConfiguration>;

      const actualData = foundry.utils.deepClone(formData.type === "stencil" ? DefaultStencilShadowConfiguration : formData.type === "blob" ? DefaultBlobShadowConfiguration : DefaultShadowConfiguration);
      foundry.utils.mergeObject(actualData, formData);

      if (formData.type === "stencil")
        foundry.utils.setProperty(actualData, "shadows", foundry.utils.deepClone((this.overrideShadowFlags as StencilShadowConfiguration).shadows));

      return actualData;
    }

    protected async _preparePartContext(partId: string, context: ShadowConfigContext<Context>, options: Options): Promise<ShadowConfigContext<Context>> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const ctx = await super._preparePartContext(partId, context, options) as any;

      // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      // if (ctx.tabs && partId in (context.tabs ?? []))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ctx.tab = ctx.tabs[partId];


      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ctx;
    }


    protected async _prepareContext(options: DeepPartial<Options>): Promise<ShadowConfigContext<Context>> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const context = (await super._prepareContext(options as any)) as unknown as ShadowConfigContext<Context>;

      this.overrideShadowFlags ??= this.getConfiguration();

      context.shadows = {
        idPrefix: foundry.utils.randomID(),
        config: foundry.utils.deepClone(this.overrideShadowFlags) as ShadowConfiguration,
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
          basics:
          {
            id: "basics",
            group: "shadows",
            active: this.tabGroups.shadows === "basics" || !this.tabGroups.shadows,
            cssClass: "",
            icon: "fa-solid fa-cog",
            label: "SPRITESHADOWS.SETTINGS.TABS.BASICS"
          },
          blob: {
            id: "blob",
            group: "shadows",
            label: "SPRITESHADOWS.SETTINGS.TABS.BLOB",
            active: this.tabGroups.shadows === "blob",
            cssClass: "",
            icon: "fa-solid fa-lightbulb"
          },
          stencil:
          {
            id: "stencil",
            group: "shadows",
            label: "SPRITESHADOWS.SETTINGS.TABS.STENCIL",
            active: this.tabGroups.shadows === "stencil",
            cssClass: "",
            icon: "fa-solid fa-lightbulb"
          }
        }
      }


      if ((context.shadows.config as StencilShadowConfiguration).shadows) {
        (context.shadows.config as StencilShadowConfiguration).shadows.forEach(shadow => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (shadow as any).label = shadow.id;
        });
      }

      return context as unknown as ShadowConfigContext<Context>
    }

    protected showShadowTypeTab(shadowType: ShadowType) {
      const blobTab = this.element.querySelector(`[data-group="shadows"][data-tab="blob"]`);
      const stencilTab = this.element.querySelector(`[data-group="shadows"][data-tab="stencil"]`);
      if (blobTab instanceof HTMLElement) blobTab.style.display = shadowType === "blob" ? "block" : "none";
      if (stencilTab instanceof HTMLElement) stencilTab.style.display = shadowType === "stencil" ? "block" : "none";
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

    _onClose(options: any) {
      window.removeEventListener("mousemove", this._shadowDragAdjustMouseMove);
      window.removeEventListener("mouseup", this._shadowDragAdjustMouseUp)
      this.overrideShadowFlags = undefined;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const obj = (this.document as any)?.object as ShadowedObject | undefined;
      if (obj) obj.refreshShadow();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super._onClose(options);

      this.outlineFilters.forEach(filter => filter.destroy());
      this.outlineFilters = [];
    }

    protected previousFormData: DeepPartial<ShadowConfiguration> = this.getShadowFlags() ?? {};


    _onChangeForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event) {
      super._onChangeForm(formConfig, event);

      const shadowedObj = this.getShadowedObject();
      if (!shadowedObj) return;

      if (!this.form) return;
      const formData = this.parseShadowFormData();
      // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      // const formData = (foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object) as any)[__MODULE_ID__] as ShadowConfiguration;


      if (shadowedObj.blobSprite) {
        shadowedObj.blobSprite.visible = formData.type === "blob";
      }

      this.previousFormData = foundry.utils.deepClone(formData);
      if (this.overrideShadowFlags)
        foundry.utils.mergeObject(this.overrideShadowFlags, formData);

      // this.overrideShadowFlags = foundry.utils.deepClone(formData);
    }

    protected async finishImport(data: ShadowConfiguration) {
      this.overrideShadowFlags = foundry.utils.deepClone(data);
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
          await navigator.clipboard.writeText(JSON.stringify(this.overrideShadowFlags));
          ui.notifications?.info("SPRITESHADOWS.SETTINGS.EXPORT.COPIED", { localize: true });
        } else {
          const content = await foundry.applications.handlebars.renderTemplate(`modules/${__MODULE_ID__}/templates/CopyJSON.hbs`, {
            config: JSON.stringify(this.overrideShadowFlags, null, 2)
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
      window.addEventListener("mousemove", this._shadowDragAdjustMouseMove);
      window.addEventListener("mouseup", this._shadowDragAdjustMouseUp);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const adjustments = (context.shadows?.config as any).adjustments as MeshAdjustments | undefined;
      if (adjustments) {
        this.#previousBlobDragAdjustments = {
          x: adjustments.x ?? 0,
          y: adjustments.y ?? 0,
          width: adjustments.width ?? 0,
          height: adjustments.height ?? 0
        }
      }
    }

    protected toggleSceneSource(enabled: boolean) {
      const tab = this.element.querySelector(`div.tab.sprite-shadows-config`);
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


    shadowTypeChanged(shadowType: ShadowType) {
      this.showShadowTypeTab(shadowType);
    }

    async _onRender(context: DeepPartial<ShadowConfigContext<Context>>, options: Options) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await super._onRender(context as any, options as any);

      const tabs = this.element.querySelector(`.tabs.top-tabs:has([data-group="shadows"])`);
      if (tabs instanceof HTMLElement)
        tabs.classList.remove("top-tabs");

      // const config = this.parseFlagData(context.shadows?.config ?? {});

      const obj = this.getShadowedObject();


      const configSourceElem = this.element.querySelector(`[name="sprite-shadows.configSource"]`);

      if (configSourceElem instanceof HTMLSelectElement) {
        this.toggleSceneSource(context.shadows?.configSource !== "scene" && context.shadows?.configSource !== "global");
        configSourceElem.addEventListener("change", () => {
          this.loadShadowConfigSettings(configSourceElem.value as ShadowConfigSource)
            .then(() => { this.toggleSceneSource(configSourceElem.value !== "scene" && context.shadows?.configSource !== "global") })
            .catch(console.error);
        })
      }

      const dragPos = this.element.querySelector(`[data-role="shadow-drag-pos"]`);
      if (dragPos instanceof HTMLButtonElement) {
        dragPos.addEventListener("mousedown", () => {
          this.shadowDragAdjustments.x = `[name="${__MODULE_ID__}.adjustments.x"]`
          this.shadowDragAdjustments.y = `[name="${__MODULE_ID__}.adjustments.y"]`
          this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
        });
      }

      const dragSize = this.element.querySelector(`[data-role="shadow-drag-size"]`);
      if (dragSize instanceof HTMLButtonElement) {
        dragSize.addEventListener("mousedown", () => {
          this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = "";
          this.shadowDragAdjustments.width = `[name="${__MODULE_ID__}.adjustments.width"]`;
          this.shadowDragAdjustments.height = `[name="${__MODULE_ID__}.adjustments.height"]`;
        })
      }

      const alphaPicker = this.element.querySelector(`[name="${__MODULE_ID__}.alpha"]`);
      if (alphaPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        alphaPicker.addEventListener("input", (e: Event) => {
          const alpha = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (obj?.blobSprite) obj.blobSprite.alpha = alpha;

          if (Array.isArray(obj?.stencilSprites))
            obj.stencilSprites.forEach(sprite => sprite.alpha = alpha);
        });
      }

      const rotationPicker = this.element.querySelector(`[name="${__MODULE_ID__}.rotation"]`);
      if (rotationPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        rotationPicker.addEventListener("input", (e: Event) => {
          const angle = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (obj?.blobSprite) obj.blobSprite.angle = angle;
          if (Array.isArray(obj?.stencilSprites))
            obj.stencilSprites.forEach(sprite => sprite.angle = angle);
        })
      }

      const skewPicker = this.element.querySelector(`[name="${__MODULE_ID__}.skew"]`);
      if (skewPicker instanceof foundry.applications.elements.HTMLRangePickerElement) {
        skewPicker.addEventListener("input", (e: Event) => {
          const skew = (e.target as foundry.applications.elements.HTMLRangePickerElement).value;
          const obj = this.getShadowedObject();
          if (Array.isArray(obj?.stencilSprites)) {
            obj.stencilSprites.forEach(sprite => sprite.skew.x = skew * (Math.PI / 180));
          }
        });
      }

      this.showShadowTypeTab(context.shadows?.config?.type ?? "blob");
      const typeSelect = this.element.querySelector(`select[name="${__MODULE_ID__}.type"]`);
      if (typeSelect instanceof HTMLSelectElement)
        typeSelect.addEventListener("change", () => {
          this.toggleConfigSection(typeSelect.value as ShadowType);
          this.shadowTypeChanged(typeSelect.value as ShadowType);
        });

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
            callback: () => { downloadJSON(this.overrideShadowFlags as object, "shadows.json"); }
          }
        ],
        {
          jQuery: false,
          eventName: "click",
          fixed: true
        }
      )


      // Set up hover outline
      const stencilEntries = this.element.querySelectorAll(`.stencil-shadow-list .stencil-shadow-list__col`);
      if (obj) {
        for (const elem of stencilEntries) {
          let outlineFilter: PIXI.Filter | undefined = undefined;
          elem.addEventListener("mouseover", () => {
            if (outlineFilter) return;
            const shadowId = (elem as HTMLElement).dataset.shadow;
            if (!shadowId) return;

            const sprite = obj.stencilSprites.find(sprite => sprite.name === `StencilShadow.${shadowId}`)
            if (!sprite) return;

            const config = this.overrideShadowFlags?.type === "stencil" ? this.overrideShadowFlags.shadows?.find(config => config.id === shadowId) : undefined;
            if (!config) return;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            outlineFilter = new (PIXI.filters as any).OutlineFilter(2, contrastColor(new PIXI.Color(config.color))) as PIXI.Filter;
            this.outlineFilters.push(outlineFilter);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (outlineFilter as any).id = `${shadowId}.outline`;
            if (Array.isArray(sprite.filters)) sprite.filters.push(outlineFilter);
            else sprite.filters = [outlineFilter];
          });

          elem.addEventListener("mouseleave", () => {
            const shadowId = (elem as HTMLElement).dataset.shadow;
            if (!shadowId) return;

            const sprite = obj.stencilSprites.find(sprite => sprite.name === `StencilShadow.${shadowId}`)
            if (!sprite) return;

            if (Array.isArray(sprite.filters)) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              const index = sprite.filters.findIndex(filter => (filter as any).id === `${shadowId}.outline`);
              if (index !== -1) {
                const filter = sprite.filters[index];
                sprite.filters.splice(index, 1);
                filter.destroy();

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const newIndex = this.outlineFilters.findIndex(filter => (filter as any).id === `${shadowId}.outline`);
                if (newIndex) this.outlineFilters.splice(newIndex, 1);

                outlineFilter = undefined;
              }
            }
          });
        }
      }

    }
  }


  // This is a little weird, but it forces footer to be after our own PARTs
  // whereas destructuring it in the earlier declaration seems to not?
  const footer = ShadowedConfig.PARTS.footer;
  delete ShadowedConfig.PARTS.footer;

  ShadowedConfig.PARTS.footer = footer;

  return ShadowedConfig;
}