import { DeepPartial, ShadowConfigSource, ShadowConfiguration } from "types";
import { ConfigMixin } from "./ConfigMixin";


export function SceneConfigMixin<t extends typeof foundry.applications.sheets.SceneConfig>(base: t) {
  class ShadowedSceneConfig extends ConfigMixin(base) {

    protected getShadowFlags(): DeepPartial<ShadowConfiguration> | undefined { return this.document.flags[__MODULE_ID__]; }
    protected getShadowedObject() { return undefined; }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async loadShadowConfigSettings(source: ShadowConfigSource) { /* Empty */ }

    protected getOriginalShadowedObject() { return undefined }
    protected hideShadowsForPreview() { /* Empty */ }
    protected unhideShadowsForPreview() { /* Empty */ }

    async _processSubmitData(event: SubmitEvent, form: HTMLFormElement, submitData: foundry.applications.ux.FormDataExtended, options?: any): Promise<void> {
      const flagData = this.parseShadowFormData();
      foundry.utils.setProperty(submitData, `flags.${__MODULE_ID__}`, flagData);
      await super._processSubmitData(event, form, submitData, options);
    }



  }

  // ShadowedSceneConfig.TABS.sheet.tabs.push({
  //   id: "shadows",
  //   icon: "fa-solid fa-lightbulb",
  //   cssClass: ""
  // });

  // // Inject our configuration part before the footer
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  // const parts = (base as any).PARTS as Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart>;
  // const footer = parts.footer;
  // delete parts.footer;

  // foundry.utils.mergeObject(parts, {
  //   shadows: {
  //     template: `modules/${__MODULE_ID__}/templates/ShadowConfig.hbs`,
  //     scrollable: ['.scrollable'],
  //     templates: [
  //       `modules/${__MODULE_ID__}/templates/BlobConfig.hbs`,
  //       `modules/${__MODULE_ID__}/templates/StencilConfig.hbs`
  //     ]
  //   },
  //   footer
  // });

  // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  // foundry.utils.mergeObject((base as any).PARTS ?? {}, parts);

  return ShadowedSceneConfig;
}