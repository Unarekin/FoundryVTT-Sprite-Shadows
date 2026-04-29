import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowedObject } from "../types";
import { GlobalConfig } from "./GlobalConfig"
import { ContextShadowConfiguration } from "./types";

export class StandaloneTokenConfig extends GlobalConfig {


  static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.TOKEN.TITLE",
    }
  }

  overrideShadowConfigSource: ShadowConfigSource | undefined = undefined;

  protected getShadowFlags(): ShadowConfiguration {
    return this.placeable.getShadowFlags() as ShadowConfiguration;
  }

  protected async setShadowFlags(config: ShadowConfiguration) {
    const source = (config as unknown as Record<string, unknown>).configSource as ShadowConfigSource;
    delete (config as unknown as Record<string, unknown>).configSource;

    await this.placeable.document.setFlag(__MODULE_ID__, "configSource", source);
    if (source === "actor" && this.placeable.actor) {
      await this.placeable.actor.update({
        flags: {
          [__MODULE_ID__]: config
        }
      });
    } else if (source === "token") {
      await this.placeable.document.setFlag(__MODULE_ID__, "config", config);
    }
  }


  protected toggleSceneSource(enabled: boolean) {
    const content = this.element.querySelector(`.window-content`)
    if (!(content instanceof HTMLElement)) return;
    const elements = Array.from<HTMLElement>(content.querySelectorAll(`input, select:not([name="sprite-shadows.configSource"]), range-picker, color-picker, :not(footer) > button, [data-role="import-shadows"], [data-role="export-shadows"], [data-action="addStencilShadow"], [data-action="editStencilShadow"], [data-action="removeStencilShadow"]`));
    for (const elem of elements) {
      if (elem instanceof HTMLButtonElement) {
        elem.disabled = !enabled;
      } else {
        if (enabled) elem.removeAttribute("disabled")
        else elem.setAttribute("disabled", "disabled");
      }
    }
  }

  protected async loadShadowConfigSettings(source: ShadowConfigSource) {
    let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;
    switch (source) {
      case "token": {
        flags = foundry.utils.deepClone(this.placeable.document.getFlag(__MODULE_ID__, "config") ?? DefaultShadowConfiguration);
        break;
      }
      case "actor": {
        const actor = this.placeable.document.actor;
        if (actor instanceof Actor) flags = foundry.utils.deepClone(actor.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
        break;
      }
      case "scene": {
        if (this.placeable.document?.parent) flags = foundry.utils.deepClone(this.placeable.document.parent.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
        break;
      }
      case "global": {
        flags = foundry.utils.deepClone(game.settings?.get(__MODULE_ID__, "globalConfig"));
        break;
      }
    }

    if (!flags) return;
    const actualFlags = flags.type === "blob" ? foundry.utils.deepClone(DefaultBlobShadowConfiguration) : flags.type === "stencil" ? foundry.utils.deepClone(DefaultStencilShadowConfiguration) : undefined;
    if (!actualFlags) return;
    foundry.utils.mergeObject(actualFlags, flags);


    this.overrideShadowFlags = foundry.utils.deepClone(actualFlags);
    this.overrideShadowConfigSource = source;
    await this.render();
  }


  async _onRender(context: ContextShadowConfiguration, options: foundry.applications.api.ApplicationV2.RenderOptions) {
    await super._onRender(context, options);

    const configSourceElem = this.element.querySelector(`[name="sprite-shadows.configSource"]`);

    if (configSourceElem instanceof HTMLSelectElement) {
      this.toggleSceneSource(context.configSource !== "scene" && context.configSource !== "global");
      configSourceElem.addEventListener("change", () => {
        this.loadShadowConfigSettings(configSourceElem.value as ShadowConfigSource)
          .then(() => { this.toggleSceneSource(configSourceElem.value !== "scene" && configSourceElem.value !== "global") })
          .catch(console.error);
      })
    }
  }

  async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options);
    context.allowConfigSource = true;
    context.configSource = this.overrideShadowConfigSource ?? this.placeable.getShadowConfigSource();

    return context;
  }

  constructor(protected placeable: ShadowedObject<foundry.canvas.placeables.Token>, options?: foundry.applications.api.ApplicationV2.Configuration) {
    super(options);
  }
}