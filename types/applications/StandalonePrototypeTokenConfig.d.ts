import { DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowedObject } from "types";
import { GlobalConfig } from "./GlobalConfig";
import { ContextShadowConfiguration } from "./types";
export declare class StandalonePrototypeTokenConfig extends GlobalConfig {
    protected placeable: ShadowedObject<foundry.data.PrototypeToken>;
    static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
    overrideShadowConfigSource: ShadowConfigSource | undefined;
    protected getShadowConfigSource(): ShadowConfigSource;
    protected getShadowFlags(source?: ShadowConfigSource): ShadowConfiguration;
    protected loadShadowConfigSettings(source: ShadowConfigSource): Promise<void>;
    protected setShadowFlags(config: ShadowConfiguration): Promise<void>;
    protected toggleSceneSource(enabled: boolean): void;
    _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<ContextShadowConfiguration>;
    _onRender(context: ContextShadowConfiguration, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void>;
    constructor(placeable: ShadowedObject<foundry.data.PrototypeToken>, options?: foundry.applications.api.ApplicationV2.Configuration);
}
