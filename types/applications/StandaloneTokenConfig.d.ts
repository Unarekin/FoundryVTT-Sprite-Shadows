import { DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowedObject } from "../types";
import { GlobalConfig } from "./GlobalConfig";
import { ContextShadowConfiguration } from "./types";
export declare class StandaloneTokenConfig extends GlobalConfig {
    protected placeable: ShadowedObject<foundry.canvas.placeables.Token>;
    static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
    overrideShadowConfigSource: ShadowConfigSource | undefined;
    protected getShadowFlags(): ShadowConfiguration;
    protected setShadowFlags(config: ShadowConfiguration): Promise<void>;
    protected toggleSceneSource(enabled: boolean): void;
    protected loadShadowConfigSettings(source: ShadowConfigSource): Promise<void>;
    protected getShadowedObject(): ShadowedObject | undefined;
    _onFirstRender(context: ContextShadowConfiguration, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void>;
    protected get controlLayer(): foundry.canvas.layers.PlaceablesLayer.Any | undefined;
    _onRender(context: ContextShadowConfiguration, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void>;
    _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<ContextShadowConfiguration>;
    constructor(placeable: ShadowedObject<foundry.canvas.placeables.Token>, options?: foundry.applications.api.ApplicationV2.Configuration);
}
