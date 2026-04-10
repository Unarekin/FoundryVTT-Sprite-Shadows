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

  return ShadowedSceneConfig;
}