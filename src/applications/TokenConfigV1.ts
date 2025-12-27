import { DeepPartial, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";
import { ShadowConfigContext } from "./types";

export function TokenConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<TokenDocument>>(base: t) {
  class ShadowedTokenConfigV1 extends ConfigMixinV1(base) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getActor(): Actor | undefined { return (this as any).actor; }
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined { return this.getActor()?.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return (this as unknown as foundry.applications.sheets.TokenConfig).document.object ?? undefined; }

    protected prepareContext(): ShadowConfigContext<any> {
      const context = super.prepareContext() as ShadowConfigContext<Record<string, unknown>>;
      context.shadows.allowTokenOverride = true;
      return context;
    }

    activateListeners(html: JQuery<HTMLElement>): void {
      super.activateListeners(html);

      const config = this.parseFlagData(this.getConfiguration());
      this.hideElements(`[data-action="loadFromActor"],[data-action="loadFromToken"]`);
      if (config.useTokenOverride && this.getActor()?.flags[__MODULE_ID__])
        this.showElements(`[data-action="loadFromActor"]`);
      else if (!config.useTokenOverride && !!this.document.flags[__MODULE_ID__])
        this.showElements(`[data-action="loadFromToken"]`);

      const elem = html[0];
      const overrideCheck = elem.querySelector(`[name="${__MODULE_ID__}.useTokenOverride"]`);
      if (overrideCheck instanceof HTMLInputElement) {
        overrideCheck.addEventListener("change", () => {
          if (overrideCheck.checked) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.overrideFlags = this.document.flags[__MODULE_ID__] ?? {};
          } else {
            this.overrideFlags = this.document.actor?.flags[__MODULE_ID__] ?? {};
          }
          this.overrideFlags ??= {};
          this.overrideFlags.useTokenOverride = overrideCheck.checked;
          console.log("Flags:", this.overrideFlags)
          void this.render();
        });
      }
    }

    protected setShadowConfiguration(config: DeepPartial<ShadowConfiguration>) {
      const flags = this.parseFlagData(config);

      if (flags.useTokenOverride) {
        return this.document.update({
          flags: {
            [__MODULE_ID__]: flags
          }
        });
      } else {
        const actor = this.getActor() ?? this.document.actor;
        if (!(actor instanceof Actor)) return;

        return this.document
          .setFlag(__MODULE_ID__, "useTokenOverride", false)
          .then(() => actor.update({
            flags: {
              [__MODULE_ID__]: flags
            }
          }));
      }
    }
  }

  ((canvas?.scene?.tokens.contents ?? [])).forEach(token => {
    if (token.sheet && !(token.sheet instanceof ShadowedTokenConfigV1)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        token._sheet = new ShadowedTokenConfigV1(token, token.sheet.options);
      } catch (err) {
        console.warn(err);
      }
    }
  })

  return ShadowedTokenConfigV1;
}