import { DeepPartial, ShadowConfigSource, ShadowConfiguration } from "types";
import { ConfigMixinV1 } from "./ConfigMixinV1";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";

export function TokenConfigMixinV1<t extends typeof foundry.appv1.api.DocumentSheet<TokenDocument>>(base: t) {
  class ShadowedTokenConfigV1 extends ConfigMixinV1(base) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getActor(): Actor | undefined { return (this as any).actor; }
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined { return this.getActor()?.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return (this as unknown as foundry.applications.sheets.TokenConfig).document.object ?? undefined; }

    protected prepareContext(): ShadowConfigContext<any> {
      const context = super.prepareContext() as ShadowConfigContext<Record<string, unknown>>;
      context.shadows.allowConfigSource = !this.isPrototype;
      return context;
    }

    protected loadShadowConfigSettings(source: ShadowConfigSource): void {
      let flags: DeepPartial<ShadowConfiguration> | undefined = undefined;
      switch (source) {
        case "token": {
          flags = foundry.utils.deepClone(this.document.getFlag(__MODULE_ID__, "config") ?? DefaultShadowConfiguration);
          break;
        }
        case "actor": {
          const actor = this.getActor();
          if (actor instanceof Actor) flags = foundry.utils.deepClone(actor.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
          break;
        }
        case "scene": {
          if (this.document?.parent) flags = foundry.utils.deepClone(this.document.parent.flags[__MODULE_ID__] ?? DefaultShadowConfiguration);
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
      this.render();
    }

    // protected getDragAdjustmentMultiplier() {
    //   return {
    //     x: 1 / this.document.width,
    //     y: 1 / this.document.height,
    //     width: 1 / this.document.width,
    //     height: 1 / this.document.height
    //   }
    // }

    activateListeners(html: JQuery<HTMLElement>): void {
      super.activateListeners(html);
      const elem = html[0];
      const overrideCheck = elem.querySelector(`[name="${__MODULE_ID__}.useTokenOverride"]`);
      if (overrideCheck instanceof HTMLInputElement) {
        overrideCheck.addEventListener("change", () => {
          if (overrideCheck.checked) {
            this.overrideShadowFlags = this.document.getFlag(__MODULE_ID__, "config") ?? {}
          } else {
            this.overrideShadowFlags = this.document.actor?.flags[__MODULE_ID__] ?? {};
          }
          this.overrideShadowFlags ??= {};
          void this.render();
        });
      }
    }

    protected async setShadowConfiguration(config: DeepPartial<ShadowConfiguration>): Promise<void> {
      const flags = this.parseFlagData(config) as ShadowConfiguration & { configSource?: ShadowConfigSource };

      const configSource = flags.configSource ?? "actor";
      delete flags.configSource;

      await this.document.setFlag(__MODULE_ID__, "configSource", configSource);
      switch (configSource) {
        case "token":
          await this.document.setFlag(__MODULE_ID__, "config", flags);
          break;
        default: {
          const actor = this.getActor() ?? this.document.actor;
          if (!(actor instanceof Actor)) return;
          await actor.update({ flags: { [__MODULE_ID__]: flags } });
        }

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