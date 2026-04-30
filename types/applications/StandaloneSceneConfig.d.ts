import { DeepPartial, ShadowConfiguration } from "types";
import { GlobalConfig } from "./GlobalConfig";
export declare class StandaloneSceneConfig extends GlobalConfig {
    protected scene: Scene;
    static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
    protected getShadowFlags(): ShadowConfiguration;
    protected setShadowFlags(config: ShadowConfiguration): Promise<void>;
    constructor(scene: Scene, options?: foundry.applications.api.ApplicationV2.Configuration);
}
