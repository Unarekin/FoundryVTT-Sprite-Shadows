import { DeepPartial, ShadowConfigSource, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";

export function SceneConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<Scene>>(base: t) {
  return class ShadowedSceneConfigV1 extends ConfigMixinV1(base) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined { return ((this as any).document as Scene).flags[__MODULE_ID__]; }
    protected getShadowedObject() { return undefined; }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected loadShadowConfigSettings(source: ShadowConfigSource): void { /* Empty */ }

    protected async setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config);
      await this.document.update({
        flags: {
          [__MODULE_ID__]: flags
        }
      })
    }
  }

}