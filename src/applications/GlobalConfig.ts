import { DeepPartial, ShadowConfiguration, ShadowType, StencilShadowConfiguration } from "types"
import { ContextShadowConfiguration, ShadowConfigContext } from "./types"
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadow, DefaultStencilShadowConfiguration } from "settings";
import { downloadJSON, uploadJSON } from "functions";
import { StencilShadowConfig } from "./StencilShadowConfig";

export class GlobalConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.GLOBAL.LABEL",
      icon: "fa-solid fa-gears",
      contentClasses: ["standard-form"],
      resizable: true
    },
    position: {
      width: 600
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: GlobalConfig.FormHandler
    },
    actions: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      removeStencilShadow: GlobalConfig.RemoveStencilShadow,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      editStencilShadow: GlobalConfig.EditStencilShadow,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      addStencilShadow: GlobalConfig.AddStencilShadow,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      cancel: GlobalConfig.Cancel
    }
  }

  static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    basics: {
      template: `modules/${__MODULE_ID__}/templates/config/basics.hbs`,
      scrollable: ['.scrollable'],
    },
    blob: {
      template: `modules/${__MODULE_ID__}/templates/config/blobSettings.hbs`,
      scrollable: ['.scrollable'],
    },
    stencil: {
      template: `modules/${__MODULE_ID__}/templates/config/stencilSettings.hbs`,
      scrollable: ['.scrollable'],
    },
    footer: {
      template: `templates/generic/form-footer.hbs`
    }
  }


  static async Cancel(this: GlobalConfig) {
    await this.close();
  }

  static async FormHandler(this: GlobalConfig, e: SubmitEvent | Event, elem: HTMLElement, data: foundry.applications.ux.FormDataExtended) {
    const parsed = (foundry.utils.expandObject(data.object) as Record<string, unknown>)["sprite-shadows"] as ShadowConfiguration | undefined;


    if (parsed) {
      if (parsed.type === "stencil")
        parsed.shadows = foundry.utils.deepClone((this.overrideShadowFlags as StencilShadowConfiguration).shadows);

      await this.setShadowFlags(parsed);
    }
  }

  protected async setShadowFlags(config: ShadowConfiguration) {
    await game.settings?.set(__MODULE_ID__, "globalConfig", config)
  }

  overrideShadowFlags: ShadowConfiguration | undefined = undefined;

  protected getShadowFlags(): ShadowConfiguration {
    const flags = foundry.utils.deepClone(DefaultShadowConfiguration);
    if (game?.settings?.get(__MODULE_ID__, "globalConfig"))
      foundry.utils.mergeObject(flags, game.settings.get(__MODULE_ID__, "globalConfig") ?? {});
    return flags;
  }

  protected getShadowConfiguration(): ShadowConfiguration {
    const flags = this.overrideShadowFlags ?? this.getShadowFlags();
    switch (flags?.type) {
      case "blob":
        return foundry.utils.mergeObject(
          foundry.utils.deepClone(DefaultBlobShadowConfiguration),
          foundry.utils.deepClone(flags)
        )
      case "stencil":
        return foundry.utils.mergeObject(
          foundry.utils.deepClone(DefaultStencilShadowConfiguration),
          foundry.utils.deepClone(flags)
        );
      default:
        return foundry.utils.mergeObject(
          foundry.utils.deepClone(DefaultShadowConfiguration),
          flags ? foundry.utils.deepClone(flags) : {}
        );
    }
  }


  protected async _preparePartContext(partId: string, context: ContextShadowConfiguration, options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const ctx = await super._preparePartContext(partId, context, options) as any;

    // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    // if (ctx.tabs && partId in (context.tabs ?? []))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    ctx.tab = ctx.tabs[partId];


    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ctx;
  }


  protected async _prepareContext(options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>): Promise<ContextShadowConfiguration> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const context = await super._prepareContext(options as any) as unknown as ShadowConfigContext<foundry.applications.api.ApplicationV2.RenderContext>;

    this.overrideShadowFlags ??= this.getShadowConfiguration();

    const newContext = {
      ...context,
      idPrefix: foundry.utils.randomID(),
      allowConfigSource: false,
      config: foundry.utils.deepClone(this.overrideShadowFlags),
      spriteAnimations: game.modules?.get("sprite-animations")?.active ?? false,
      adjustPosTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustPosition.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGPOS")}</p></div>`,
      adjustSizeTooltip: `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustSize.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGSIZE")}</p></div>`,
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
        scene: "DOCUMENT.Scene"
      },
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
      },
      buttons: [
        { type: "button", action: "cancel", icon: "fa-solid fa-times", label: "Cancel" },
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };

    if (Array.isArray((newContext.config as StencilShadowConfiguration).shadows)) {
      (newContext.config as StencilShadowConfiguration).shadows.forEach(shadow => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (shadow as any).label = shadow.id;
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return newContext as any;
  }

  protected showShadowTypeTab(shadowType: ShadowType) {
    const blobTab = this.element.querySelector(`[data-group="shadows"][data-tab="blob"]`);
    const stencilTab = this.element.querySelector(`[data-group="shadows"][data-tab="stencil"]`);
    if (blobTab instanceof HTMLElement) blobTab.style.display = shadowType === "blob" ? "block" : "none";
    if (stencilTab instanceof HTMLElement) stencilTab.style.display = shadowType === "stencil" ? "block" : "none";
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

  async _onRender(context: DeepPartial<ShadowConfigContext<foundry.applications.api.ApplicationV2.RenderContext>>, options: foundry.applications.api.ApplicationV2.RenderOptions) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await super._onRender(context as any, options as any);

    const disabledElems: HTMLElement[] = Array.from(this.element.querySelectorAll(`[data-role="shadow-drag-pos"], [data-role="shadow-drag-size"], [data-role="auto-shadow-anchor"]`));
    for (const elem of disabledElems) {
      if (elem instanceof HTMLButtonElement || elem instanceof HTMLInputElement || elem instanceof HTMLSelectElement)
        elem.disabled = true;
      else
        elem.setAttribute("disabled", "disabled");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.showShadowTypeTab(((context as any).config as ShadowConfiguration)?.type ?? "blob");
    const typeSelect = this.element.querySelector(`select[name="${__MODULE_ID__}.type"]`);
    if (typeSelect instanceof HTMLSelectElement) {
      typeSelect.addEventListener("change", () => {
        this.showShadowTypeTab(typeSelect.value as ShadowType)
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
  }

  static async AddStencilShadow(this: GlobalConfig) {
    try {

      const shadowConfig = foundry.utils.deepClone(DefaultStencilShadow);
      const data = await StencilShadowConfig.Edit(shadowConfig);

      if (data && this.overrideShadowFlags?.type === "stencil") {
        if (Array.isArray(this.overrideShadowFlags.shadows)) this.overrideShadowFlags.shadows.push(foundry.utils.deepClone(data));
        else this.overrideShadowFlags.shadows = [foundry.utils.deepClone(data)];
      }
      await this.render();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
    }
  }

  static async EditStencilShadow(this: GlobalConfig, e: Event, elem: HTMLElement) {
    try {
      if (this.overrideShadowFlags?.type !== "stencil") return console.warn("No shadow flags stored");
      if (!Array.isArray(this.overrideShadowFlags.shadows)) return console.warn("No shadows on flags");

      if (!elem.dataset.shadow) return console.warn("No shadow ID");
      const shadowId = elem.dataset.shadow;
      const shadowConfig = this.overrideShadowFlags.shadows.find(item => item.id === shadowId);
      if (!shadowConfig) return console.warn("No shadow config found");

      const data = await StencilShadowConfig.Edit(shadowConfig);
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


  static async RemoveStencilShadow(this: GlobalConfig, e: Event, elem: HTMLElement) {
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

      await this.render();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
    }
  }


}