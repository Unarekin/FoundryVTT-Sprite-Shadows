import { DeepPartial, ShadowConfiguration, ShadowConfigSource, ShadowedObject } from "types";
import { ConfigMixin } from "./ConfigMixin";
import { ShadowConfigContext } from "./types";
import { DefaultBlobShadowConfiguration, DefaultShadowConfiguration, DefaultStencilShadowConfiguration } from "settings";

export function TokenConfigMixin<t extends typeof foundry.applications.sheets.TokenConfig>(base: t) {
  class ShadowedTokenConfig extends ConfigMixin(base) {


    protected getOriginalShadowedObject(): foundry.canvas.placeables.Token | undefined {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (this as any).token?.object;
    }

    protected hidePreviewShadows() {
      requestAnimationFrame(() => {
        const obj = this.getOriginalShadowedObject() as ShadowedObject | undefined;
        if (!obj) return console.warn("Could not find original shadowed object");
        if (obj.blobSprite) obj.blobSprite.visible = false;
        if (Array.isArray(obj.stencilSprites))
          obj.stencilSprites.forEach(sprite => sprite.visible = false);
      });
    }

    async _initializePreview() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await super._initializePreview();
      this.hidePreviewShadows();
    }

    // TODO: Remove when dropping v13 support
    async _initializeTokenPreview() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await super._initializeTokenPreview();
      this.hidePreviewShadows();
    }

    protected getDragAdjustmentMultiplier() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const isPrototype = (this as any).isPrototype as boolean;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const docWidth = isPrototype ? ((this as any).token as foundry.data.PrototypeToken).width : this.document.width;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const docHeight = isPrototype ? ((this as any).token as foundry.data.PrototypeToken).height : this.document.height;
      return {
        x: 1 / docWidth,
        y: 1 / docHeight,
        width: 1 / docWidth,
        height: 1 / docHeight
      }
    }

    async _processSubmitData(event: SubmitEvent, form: HTMLFormElement, submitData: foundry.applications.ux.FormDataExtended, options: any): Promise<void> {
      const flagData = this.parseShadowFormData() as ShadowConfiguration & { configSource?: ShadowConfigSource };

      const configSource = flagData.configSource;
      delete flagData.configSource;

      if (this.document)
        await this.document.setFlag(__MODULE_ID__, "configSource", configSource ?? "actor");
      switch (configSource) {
        case "actor": {
          const actor = this.getActor();
          if (actor)
            await actor.update({ flags: { [__MODULE_ID__]: flagData } });
          break;
        }
        case "token": {
          await this.document.setFlag(__MODULE_ID__, "config", flagData);
          // await this.document.update({ flags: { [__MODULE_ID__]: flagData } });
          break;
        }
      }

      await super._processSubmitData(event, form, submitData, options);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getActor(): Actor | undefined { return (this as any).actor; }

    protected async loadShadowConfigSettings(source: ShadowConfigSource) {
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
      console.log("Override source:", source);
      await this.render();
    }

    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined {

      let configSource = this.document.getFlag(__MODULE_ID__, "configSource") ?? "actor";

      const flags = this.document.flags[__MODULE_ID__] ?? {};
      // <1.2.0 compatibility check
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof (flags as any).useTokenOverride !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        configSource = (flags as any).useTokenOverride ? "token" : "actor";
      }

      if (!this.isPrototype && configSource === "token") {
        return this.document.getFlag(__MODULE_ID__, "config");
      } else if (configSource === "global") {
        if (game.settings?.settings.get(`${__MODULE_ID__}.globalConfig`))
          return game.settings?.get(__MODULE_ID__, "globalConfig");
        else
          return foundry.utils.deepClone(DefaultShadowConfiguration);
      } else if (configSource === "scene") {
        return this.document.parent?.flags[__MODULE_ID__];
      } else {
        const actor = this.getActor();
        if (actor) return actor.flags[__MODULE_ID__];
      }
    }
    protected getShadowedObject() { return (this as foundry.applications.sheets.TokenConfig).document?.object ?? undefined }

    async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event | SubmitEvent): Promise<void> {
      await super._onSubmitForm(formConfig, event);
      if (this.isPrototype) {
        const actor = this.getActor();
        const flagData = this.parseShadowFormData() as ShadowConfiguration;
        if (actor) await actor.update({ flags: { [__MODULE_ID__]: flagData } });
      }
    }

    // async _onRender(context: DeepPartial<ShadowConfigContext<TokenConfig.RenderContext>>, options: TokenConfig.RenderOptions) {
    //   await super._onRender(context, options);


    // }


    protected async _prepareContext(options: DeepPartial<TokenConfig.RenderOptions>): Promise<ShadowConfigContext<TokenConfig.RenderContext>> {
      const context = await super._prepareContext(options);
      context.shadows.allowConfigSource = !this.isPrototype;
      context.shadows.configSource = this.overrideShadowConfigSource ?? this.document.getFlag(__MODULE_ID__, "configSource") ?? "actor";
      return context;
    }
  }

  return ShadowedTokenConfig
}
