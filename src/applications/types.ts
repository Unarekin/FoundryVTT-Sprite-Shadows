import { BlobShape, ShadowAlignment, ShadowConfigSource, ShadowConfiguration, ShadowType, StencilShadow } from "types";

export type ShadowConfigContext<t extends foundry.applications.api.ApplicationV2.RenderContext> = t & {
  shadows: {
    idPrefix: string;
    allowConfigSource: boolean;
    config: ShadowConfiguration;
    typeSelect: Record<ShadowType, string>;
    alignmentSelect: Record<ShadowAlignment, string>;
    blobShapeSelect: Record<BlobShape, string>;
    adjustPosTooltip: string;
    adjustSizeTooltip: string;
    spriteAnimations: boolean;
    configSourceSelect: Partial<Record<ShadowConfigSource, string>>;
    configSource?: ShadowConfigSource;

    tabs: Record<string, foundry.applications.api.ApplicationV2.Tab>;
  }
  v1?: boolean;
  tab?: foundry.applications.api.ApplicationV2.Tab;
}

export interface StencilShadowContext extends foundry.applications.api.ApplicationV2.RenderContext {
  idPrefix: string;
  shadow: StencilShadow;
  spriteAnimations: boolean;
  alignmentSelect: Record<ShadowAlignment, string>;
  buttons: foundry.applications.api.ApplicationV2.FormFooterButton[];
}