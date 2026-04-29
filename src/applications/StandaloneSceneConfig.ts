import { DeepPartial, ShadowConfiguration } from "types";
import { GlobalConfig } from "./GlobalConfig"
import { DefaultShadowConfiguration } from "settings";


export class StandaloneSceneConfig extends GlobalConfig {

  static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.SCENE.TITLE",
    }
  }

  protected getShadowFlags(): ShadowConfiguration {
    const flags = (this.scene.flags[__MODULE_ID__] as ShadowConfiguration) ?? DefaultShadowConfiguration;
    console.log("Flags:", flags);
    return flags;
  }

  protected async setShadowFlags(config: ShadowConfiguration) {
    console.log("Setting:", config);
    await this.scene.update({
      flags: {
        [__MODULE_ID__]: config
      }
    });
  }


  constructor(protected scene: Scene, options?: foundry.applications.api.ApplicationV2.Configuration) {
    super(options);

  }
}