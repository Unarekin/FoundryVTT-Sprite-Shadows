import { DeepPartial, ShadowConfigSource, ShadowConfiguration, ShadowedObject } from "../types";
import { GlobalConfig } from "./GlobalConfig";
import { ContextShadowConfiguration } from "./types";
export declare class StandaloneTileConfig extends GlobalConfig {
    protected placeable: ShadowedObject<foundry.canvas.placeables.Tile>;
    static DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>;
    overrideShadowConfigSource: ShadowConfigSource | undefined;
    protected getShadowFlags(): ShadowConfiguration;
    protected setShadowFlags(config: ShadowConfiguration): Promise<void>;
    protected toggleSceneSource(enabled: boolean): void;
    protected loadShadowConfigSettings(source: ShadowConfigSource): Promise<void>;
    _onRender(context: ContextShadowConfiguration, options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<void>;
    _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions): Promise<ContextShadowConfiguration>;
    constructor(placeable: ShadowedObject<foundry.canvas.placeables.Tile>, options?: foundry.applications.api.ApplicationV2.Configuration);
}
