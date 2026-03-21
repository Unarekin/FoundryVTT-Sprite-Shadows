import { DeepPartial, ShadowConfiguration } from "types"
import { ShadowConfigContext } from "./types"
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";

export class GlobalConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.GLOBAL.LABEL",
      icon: "fa-solid fa-gears",
      contentClasses: ["standard-form"],
      resizable: true
    },
    position: {
      width: 400,
      height: 500
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: GlobalConfig.FormHandler
    }
  }

  static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: `modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`,
      scrollable: ['.scrollable'],
      templates: [
        `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
        `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
      ]
    },
    footer: {
      template: `templates/generic/form-footer.hbs`
    }
  }

  static async FormHandler(this: GlobalConfig, e: SubmitEvent | Event, elem: HTMLElement, data: foundry.applications.ux.FormDataExtended) {
    const parsed = (foundry.utils.expandObject(data.object) as Record<string, unknown>)["sprite-shadows"] as ShadowConfiguration | undefined;
    if (parsed)
      await game.settings?.set(__MODULE_ID__, "globalConfig", parsed)
  }

  #overrideShadowFlags: ShadowConfiguration | undefined = undefined;

  protected getShadowFlags(): ShadowConfiguration {
    return game?.settings?.get(__MODULE_ID__, "globalConfig") ?? foundry.utils.deepClone(DefaultShadowConfiguration);
  }

  protected getShadowConfiguration(): ShadowConfiguration {
    const flags = this.#overrideShadowFlags ?? this.getShadowFlags();
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

  protected async _prepareContext(options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>): Promise<ShadowConfigContext<foundry.applications.api.ApplicationV2.RenderContext>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const context = await super._prepareContext(options as any) as unknown as ShadowConfigContext<foundry.applications.api.ApplicationV2.RenderContext>;

    this.#overrideShadowFlags ??= this.getShadowConfiguration();

    context.shadows ??= {} as any;

    context.shadows = {
      ...context.shadows,
      idPrefix: foundry.utils.randomID(),
      allowConfigSource: false,
      config: foundry.utils.deepClone(this.#overrideShadowFlags),
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
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (context as any).buttons = [
      { type: "button", icon: "fa-solid fa-times", label: "Cancel", action: "cancel" },
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (context as any).global = true;

    return context;
  }
}