import { DeepPartial, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";
import { ShadowConfigContext } from "./types";

export function TileConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<TileDocument>>(base: t) {
  class ShadowedTileConfigV1 extends ConfigMixinV1(base) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getFlags(): DeepPartial<ShadowConfiguration> | undefined { return (this as any).document.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return this.document.object }

    protected prepareContext(): ShadowConfigContext<any> {
      return {
        ...super.prepareContext(),
        omitGroup: true
      }
    }

    protected setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config);
      return this.document.update({
        flags: {
          [__MODULE_ID__]: flags
        }
      })
    }
  }



  return ShadowedTileConfigV1;
}