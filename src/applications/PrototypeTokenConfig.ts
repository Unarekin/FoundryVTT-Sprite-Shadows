import { ConfigMixin } from "./ConfigMixin";
import { DeepPartial, ShadowConfiguration, ShadowedObject, ShadowConfigSource } from "types";
import { DefaultShadowConfiguration } from "settings";

export function PrototypeTokenConfigMixin<t extends typeof foundry.applications.sheets.PrototypeTokenConfig>(base: t) {

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  class ShadowedPrototypeTokenConfig extends ConfigMixin(base as any) {


    public get token(): foundry.data.PrototypeToken { return super.token as foundry.data.PrototypeToken; }
    public get actor(): foundry.documents.Actor { return super.actor as foundry.documents.Actor; }

    protected getShadowConfigSource(): ShadowConfigSource {
      return this.token.getFlag(__MODULE_ID__, "configSource") ?? "actor";
    }


    protected getShadowFlags(source?: ShadowConfigSource): DeepPartial<ShadowConfiguration> | undefined {
      const flags = foundry.utils.deepClone(DefaultShadowConfiguration);
      const actualSource = source ?? this.getShadowConfigSource();

      switch (actualSource) {
        case "global":
          foundry.utils.mergeObject(flags, game.settings?.get(__MODULE_ID__, "globalConfig"));
          break;
        case "actor":
          foundry.utils.mergeObject(flags, foundry.utils.deepClone(this.actor.flags[__MODULE_ID__]));
          break;
        case "token":
          foundry.utils.mergeObject(flags, foundry.utils.deepClone(this.token.getFlag(__MODULE_ID__, "config")));
          break;
      }

      return flags;
    }
    protected getShadowedObject(): ShadowedObject | undefined { return undefined; }
    protected getOriginalShadowedObject(): foundry.canvas.placeables.PlaceableObject | undefined { return undefined; }


    protected async loadShadowConfigSettings(source: ShadowConfigSource): Promise<void> {
      this.overrideShadowFlags = this.getShadowFlags(source);
      this.overrideShadowConfigSource = source;
      await this.render();
    }


    async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, e: Event | SubmitEvent) {
      if (!(e.target instanceof HTMLFormElement)) return console.warn("No form element to submit");

      const formData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(e.target).object) as Record<string, unknown>;


      const config = formData["sprite-shadows"] as ShadowConfiguration;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const source = ((config as any).configSource ?? "actor") as ShadowConfigSource;
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
      }

      switch (source) {
        case "actor":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (update as any).flags = {
            [__MODULE_ID__]: foundry.utils.deepClone(config)
          }
          break;
        case "token":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (update.prototypeToken.flags[__MODULE_ID__] as any).config = foundry.utils.deepClone(config);
          break;
      }

      await super._onSubmitForm(formConfig, e);
      await this.actor.update(update);
    }


    async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions) {
      const context = await super._prepareContext(options);

      this.overrideShadowConfigSource ??= this.getShadowConfigSource();
      this.overrideShadowFlags ??= this.getConfiguration();

      context.shadows.allowConfigSource = true;
      context.shadows.configSource = this.overrideShadowConfigSource;

      return context;
    }

  }


  return ShadowedPrototypeTokenConfig;
}