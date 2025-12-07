import { DeepPartial, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";

export function TokenConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<TokenDocument>>(base: t) {
  class ShadowedTokenConfigV1 extends ConfigMixinV1(base) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getActor(): Actor | undefined { return (this as any).actor; }
    protected getFlags(): DeepPartial<ShadowConfiguration> | undefined { return this.getActor()?.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return (this as unknown as foundry.applications.sheets.TokenConfig).document.object ?? undefined; }

    protected setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config);

      const actor = this.getActor() ?? this.document.actor;
      if (!(actor instanceof Actor)) return;

      return actor.update({
        flags: {
          [__MODULE_ID__]: flags
        }
      });
      return flags;
    }
  }

  return ShadowedTokenConfigV1;
}