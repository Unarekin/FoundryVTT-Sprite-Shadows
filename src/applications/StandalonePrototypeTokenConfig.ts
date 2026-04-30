import { DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowedObject } from "types";
import { GlobalConfig } from "./GlobalConfig";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";
import { ContextShadowConfiguration } from "./types";

export class StandalonePrototypeTokenConfig extends GlobalConfig {
  static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.TOKEN.TITLE",
    }
  }

  overrideShadowConfigSource: ShadowConfigSource | undefined = undefined;

  protected getShadowConfigSource(): ShadowConfigSource {
    return this.placeable.getFlag(__MODULE_ID__, "configSource") ?? "actor";
  }

  protected getShadowFlags(source?: ShadowConfigSource): ShadowConfiguration {
    let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;
    const actualSource = source ?? this.getShadowConfigSource();

    switch (actualSource) {
      case "token": {
        flags = foundry.utils.deepClone(this.placeable.getFlag(__MODULE_ID__, "config") ?? DefaultShadowConfiguration);
        break;
      }
      case "actor": {
        flags = foundry.utils.deepClone(this.placeable.actor.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
        break;
      }
      case "global": {
        flags = foundry.utils.deepClone(game.settings?.get(__MODULE_ID__, "globalConfig") ?? DefaultShadowConfiguration);
      }
    }
    if (!flags) return foundry.utils.deepClone(DefaultShadowConfiguration);

    const actualFlags = flags.type === "blob" ? foundry.utils.deepClone(DefaultBlobShadowConfiguration) : flags.type === "stencil" ? foundry.utils.deepClone(DefaultStencilShadowConfiguration) : DefaultShadowConfiguration;
    foundry.utils.mergeObject(actualFlags, flags);
    return actualFlags;
  }

  protected async loadShadowConfigSettings(source: ShadowConfigSource) {
    const flags = this.getShadowFlags(source);
    this.overrideShadowFlags = foundry.utils.deepClone(flags);
    this.overrideShadowConfigSource = source;
    await this.render();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async setShadowFlags(config: ShadowConfiguration) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const source = (config as any).configSource as ShadowConfigSource;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete (config as any).configSource;

    const update = {
      prototypeToken: {
        flags: {
          [__MODULE_ID__]: {
            configSource: source
          }
        }
      }
    };

    switch (source) {
      case "actor":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (update as any).flags = {
          [__MODULE_ID__]: foundry.utils.deepClone(config)
        };
        break;
      case "token":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (update.prototypeToken.flags[__MODULE_ID__] as any).config = foundry.utils.deepClone(config);
        break;
    }

    await this.placeable.actor.update(update);
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

  async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options);

    context.allowConfigSource = true;
    context.configSource = this.overrideShadowConfigSource ?? this.getShadowConfigSource();

    return context;
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

  constructor(protected placeable: ShadowedObject<foundry.data.PrototypeToken>, options?: foundry.applications.api.ApplicationV2.Configuration) {
    super(options);
  }
}