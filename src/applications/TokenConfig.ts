import { DeepPartial, ShadowConfiguration } from "types";
import { ConfigMixin } from "./ConfigMixin";
import { ShadowConfigContext } from "./types";

export function TokenConfigMixin<t extends typeof foundry.applications.sheets.TokenConfig>(base: t) {
  class ShadowedTokenConfig extends ConfigMixin(base) {

    static DEFAULT_OPTIONS = {
      actions: {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        loadFromActor: ShadowedTokenConfig.LoadFromActor,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        loadFromToken: ShadowedTokenConfig.LoadFromToken
      }
    }

    public static async LoadFromActor(this: ShadowedTokenConfig) {
      try {
        const actor = this.getActor();
        if (!actor) return;
        this.overrideFlags = foundry.utils.deepClone(actor.flags[__MODULE_ID__] ?? {});
        const overrideCheck = this.element.querySelector(`[name="${__MODULE_ID__}.useTokenOverride"]`);
        if (overrideCheck instanceof HTMLInputElement)
          this.overrideFlags.useTokenOverride = overrideCheck.checked;

        await this.render();
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false })
      }
    }

    public static async LoadFromToken(this: ShadowedTokenConfig) {
      try {
        this.overrideFlags = foundry.utils.deepClone(this.document.flags[__MODULE_ID__] as DeepPartial<ShadowConfiguration> ?? {});
        const overrideCheck = this.element.querySelector(`[name="${__MODULE_ID__}.useTokenOverride"]`);
        if (overrideCheck instanceof HTMLInputElement)
          this.overrideFlags.useTokenOverride = overrideCheck.checked;

        await this.render();
      } catch (err) {
        console.error(err);
        if (err instanceof Error) ui.notifications?.error(err.message, { console: false })
      }
    }

    protected getDragAdjustmentMultiplier() {
      return {
        x: 1 / this.document.width,
        y: 1 / this.document.height,
        width: 1 / this.document.width,
        height: 1 / this.document.height
      }
    }

    async _processSubmitData(event: SubmitEvent, form: HTMLFormElement, submitData: foundry.applications.ux.FormDataExtended, options: any): Promise<void> {
      const flagData = this.parseShadowFormData();
      foundry.utils.setProperty(submitData, `flags.${__MODULE_ID__}.useTokenOverride`, !!flagData.useTokenOverride);
      if (flagData.useTokenOverride) {
        foundry.utils.setProperty(submitData, `flags.${__MODULE_ID__}`, flagData);
      } else {
        if (this.document)
          await this.document.setFlag(__MODULE_ID__, "useTokenOverride", false);
        const actor = this.getActor();
        if (actor) await actor.update({ flags: { [__MODULE_ID__]: flagData } });
      }
      await super._processSubmitData(event, form, submitData, options);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    protected getActor(): Actor | undefined { return (this as any).actor; }
    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!this.isPrototype && this.document.flags[__MODULE_ID__]?.useTokenOverride) return this.document.flags[__MODULE_ID__] as DeepPartial<ShadowConfiguration>;
      else return this.getActor()?.flags[__MODULE_ID__];
    }
    protected getShadowedObject() { return (this as foundry.applications.sheets.TokenConfig).document?.object ?? undefined }

    async _onSubmitForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event | SubmitEvent): Promise<void> {
      const flagData = this.parseShadowFormData();
      await super._onSubmitForm(formConfig, event);
      if (this.isPrototype) {
        const actor = this.getActor();
        if (actor) await actor.update({flags: { [__MODULE_ID__]: flagData }});
      }
    }

    async _onRender(context: DeepPartial<ShadowConfigContext<TokenConfig.RenderContext>>, options: TokenConfig.RenderOptions) {
      await super._onRender(context, options);
      const overrideCheck = this.element.querySelector(`[name="${__MODULE_ID__}.useTokenOverride"]`);
      if (overrideCheck instanceof HTMLInputElement) {
        overrideCheck.addEventListener("change", () => {
          if (overrideCheck.checked) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.overrideFlags = this.document.flags[__MODULE_ID__] ?? {};
          } else {
            this.overrideFlags = this.document.actor?.flags[__MODULE_ID__] ?? {};
          }
          if (this.overrideFlags) this.overrideFlags.useTokenOverride = overrideCheck.checked;
          void this.render();
        });
      }

      this.hideElements(`[data-action="loadFromActor"],[data-action="loadFromToken"]`);
      if (context.shadows?.config?.useTokenOverride && this.getActor()?.flags[__MODULE_ID__])
        this.showElements(`[data-action="loadFromActor"]`);
      else if (!context.shadows?.config?.useTokenOverride && (!this.isPrototype && this.document.flags[__MODULE_ID__]))
        this.showElements(`[data-action="loadFromToken"]`);
    }


    protected async _prepareContext(options: DeepPartial<TokenConfig.RenderOptions>): Promise<ShadowConfigContext<TokenConfig.RenderContext>> {
      const context = await super._prepareContext(options);
      context.shadows.allowTokenOverride = !this.isPrototype;
      return context;
    }
  }

  ShadowedTokenConfig.TABS.sheet.tabs.push({
    id: "shadows",
    icon: "fa-solid fa-lightbulb",
    cssClass: ""
  });

  // Inject our configuration part before the footer
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const parts = (base as any).PARTS as Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart>;
  const footer = parts.footer;
  delete parts.footer;

  foundry.utils.mergeObject(parts, {
    shadows: {
      template: `modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`,
      templates: [
        `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
        `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
      ]
    },
    footer
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  foundry.utils.mergeObject((base as any).PARTS ?? {}, parts);

  ((canvas?.scene?.tokens.contents ?? [])).forEach(token => {
    if (token.sheet && !(token.sheet instanceof ShadowedTokenConfig)) {

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        token._sheet = new ShadowedTokenConfig(token.sheet.options);
      } catch (err) {
        console.warn(err);
      }
    }

  })

  return ShadowedTokenConfig
}
