import { BlobShadowConfiguration, DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowType, StencilShadowConfiguration, ShadowedObject } from "types";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadow, DefaultStencilShadowConfiguration } from "settings";
import { downloadJSON, findBottomAnchorPoint, findCentralAnchorPoint, uploadJSON } from "functions";
import { StencilShadowConfig } from "./StencilShadowConfig";
import { controlSprite, highlightSprite, releaseSprite, unhighlightSprite } from "./functions";



export function ConfigMixin<Document extends foundry.abstract.Document.Any = foundry.abstract.Document.Any, Context extends foundry.applications.api.ApplicationV2.RenderContext = foundry.applications.api.ApplicationV2.RenderContext, Config extends foundry.applications.api.DocumentSheetV2.Configuration<Document> = foundry.applications.api.DocumentSheetV2.Configuration<Document>, Options extends foundry.applications.api.DocumentSheetV2.RenderOptions = foundry.applications.api.DocumentSheetV2.RenderOptions>(base: typeof foundry.applications.api.DocumentSheetV2<Document, Context, Config, Options>) {
  abstract class ShadowedConfig extends base {

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
            obj.setStencilShadowConfig(sprite, shadowConfig, obj.mesh, (this.overrideShadowFlags as Required<ShadowConfiguration>) ?? DefaultStencilShadowConfiguration);
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (ctx.tabs && partId in (context.tabs ?? []))
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        ctx.tab = ctx.tabs?.[partId];


      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ctx;
    }


    _onClickTab(e: PointerEvent) {
      super._onClickTab(e);
      this._setDraggable();
    }

    protected _onSizeDrag(e: { x: number, y: number }) {

      const obj = this.getShadowedObject();
      const adjustmentMultipliers = obj?.getShadowAdjustmentMultipliers() ?? { x: 1, y: 1, width: 1, height: 1 };

      const widthElem = this.element.querySelector(`[name="sprite-shadows.adjustments.width"]`);
      if (widthElem instanceof HTMLInputElement)
        widthElem.value = (parseFloat(widthElem.value) + (e.x / adjustmentMultipliers.width / 2)).toString();
      const heightElem = this.element.querySelector(`[name="sprite-shadows.adjustments.height"]`);
      if (heightElem instanceof HTMLInputElement)
        heightElem.value = (parseFloat(heightElem.value) + (e.y / adjustmentMultipliers.height / 2)).toString();
    }


    _setDraggable() {
      const obj = this.getShadowedObject() as ShadowedObject<Token>;
      if (!obj) return;
      if (obj.blobSprite && this.tabGroups.sheet === "shadows") {
        obj.blobSprite.cursor = "grab";
        obj.blobSprite.interactive = true;
        controlSprite(obj.blobSprite, true, this._onSizeDrag.bind(this));
      } else if (obj.blobSprite) {
        obj.blobSprite.cursor = "inherit";
        obj.blobSprite.interactive = false;
        releaseSprite(obj.blobSprite);
      }
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
      if (canvas?.tokens)
        canvas.tokens.eventMode = "static";
      if (canvas?.primary) {
        canvas.primary.eventMode = "none";
      }


      this.overrideShadowFlags = undefined;

      const shadowedObj = this.getShadowedObject();
      console.log("_onClose:", shadowedObj);

      if (shadowedObj) {
        if (shadowedObj.blobSprite) {
          unhighlightSprite(shadowedObj.blobSprite);
          releaseSprite(shadowedObj.blobSprite);
        }

        if (Array.isArray(shadowedObj.stencilSprites)) {
          shadowedObj.stencilSprites.forEach(sprite => {
            unhighlightSprite(sprite);
            releaseSprite(sprite);
          });
        }
      }


      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      super._onClose(options);
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

      shadowedObj.refreshShadow(true);

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

    protected toggleSceneSource(enabled: boolean) {
      const tab = this.element.querySelector(`div.tab.sprite-shadows-config`);
      if (!(tab instanceof HTMLElement)) return;
      const elements = Array.from<HTMLElement>(tab.querySelectorAll(`input, select:not([name="sprite-shadows.configSource"]), range-picker, color-picker, button, [data-role="import-shadows"], [data-role="export-shadows"], [data-action="addStencilShadow"], [data-action="editStencilShadow"], [data-action="removeStencilShadow"]`));
      for (const elem of elements) {
        if (elem instanceof HTMLButtonElement) {
          elem.disabled = !enabled;
        } else {
          if (enabled) elem.removeAttribute("disabled")
          else elem.setAttribute("disabled", "disabled");
        }
      }
    }

    #dragTarget: PIXI.Sprite | undefined = undefined;
    #highlightBorderDisplayed = false;

    protected _beginDragSprite(e: PIXI.FederatedPointerEvent, sprite: PIXI.Sprite) {
      if (e.buttons !== 1) return;

      e.stopPropagation();
      sprite.cursor = "grabbing";
      this.#dragTarget = sprite;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const placeable = (sprite as any).placeable;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (placeable._preview?.border) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.#highlightBorderDisplayed = placeable._preview.border.visible as boolean;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        placeable._preview.border.visible = false;
      }
      releaseSprite(sprite);
    }

    protected _endDragSprite = ((e: PIXI.FederatedPointerEvent) => {
      if (!this.#dragTarget) return;

      e.stopPropagation();

      controlSprite(this.#dragTarget, true, this._onSizeDrag.bind(this));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const placeable = (this.#dragTarget as any).placeable;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (placeable._preview?.border) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        placeable._preview.border.visible = !!this.#highlightBorderDisplayed;
      }

      this.#dragTarget.cursor = "grab";
      this.#dragTarget = undefined;


    }).bind(this);

    protected _onDragSprite = ((e: MouseEvent) => {
      if (!this.#dragTarget) return;
      if (e.buttons !== 1) return;
      e.stopPropagation();

      const global = this.#dragTarget.getGlobalPosition().clone();
      global.x += e.movementX;
      global.y += e.movementY;
      const start = this.#dragTarget.position.clone();
      this.#dragTarget.parent.toLocal(global, undefined, this.#dragTarget.position);
      const delta = new PIXI.Point(this.#dragTarget.x - start.x, this.#dragTarget.y - start.y);

      if (this.overrideShadowFlags?.type === "blob") {
        this.overrideShadowFlags.adjustments ??= { x: 0, y: 0 };

        this.overrideShadowFlags.adjustments.x = (this.overrideShadowFlags.adjustments.x ?? 0) + delta.x;
        this.overrideShadowFlags.adjustments.y = (this.overrideShadowFlags.adjustments.y ?? 0) + delta.y;

        this.setFormElementValue(`[name="sprite-shadows.adjustments.x"]`, this.overrideShadowFlags.adjustments.x.toString(), false);
        this.setFormElementValue(`[name="sprite-shadows.adjustments.y"]`, this.overrideShadowFlags.adjustments.y.toString(), false);

        releaseSprite(this.#dragTarget);
      }

    }).bind(this);


    protected _setDragListeners() {
      const obj = this.getShadowedObject() as ShadowedObject<Token> | undefined;
      if (!obj) return;
      if (!canvas?.primary) return;

      if (canvas?.tokens)
        canvas.tokens.eventMode = "passive";

      canvas.primary.eventMode = "passive";

      window.addEventListener("mousemove", this._onDragSprite);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      window.addEventListener("mouseup", this._endDragSprite as any);

      if (obj.blobSprite) {
        obj.blobSprite.addEventListener("pointerdown", e => {
          if (this.tabGroups.sheet === 'shadows' && e.buttons === 1)
            this._beginDragSprite(e, obj.blobSprite);
        });
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

      this._setDraggable();
      const configSourceElem = this.element.querySelector(`[name="sprite-shadows.configSource"]`);

      if (configSourceElem instanceof HTMLSelectElement) {
        this.toggleSceneSource(context.shadows?.configSource !== "scene" && context.shadows?.configSource !== "global");
        configSourceElem.addEventListener("change", () => {
          this.loadShadowConfigSettings(configSourceElem.value as ShadowConfigSource)
            .then(() => { this.toggleSceneSource(configSourceElem.value !== "scene" && configSourceElem.value !== "global") })
            .catch(console.error);
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

      const obj = this.getShadowedObject();
      if (obj)
        this._addHighlightHandlers(obj);
    }



    protected _addHighlightHandlers(placeable: ShadowedObject) {
      const stencilEntries: HTMLElement[] = Array.from(this.element.querySelectorAll(`.stencil-shadow-list .stencil-shadow-list__col`));

      for (const elem of stencilEntries) {
        elem.addEventListener("mouseover", () => {
          const shadowId = elem.dataset.shadow;
          const sprite = placeable.stencilSprites.find(sprite => sprite.name === `StencilShadow.${shadowId}`);
          if (!sprite) return;
          highlightSprite(sprite);
        });

        elem.addEventListener("mouseleave", () => {
          const shadowId = elem.dataset.shadow;
          if (!shadowId) return;

          const sprite = placeable.stencilSprites.find(sprite => sprite.name === `StencilShadow.${shadowId}`);
          if (!sprite) return;

          unhighlightSprite(sprite);
        })
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