import { BlobShape, ShadowAlignment, ShadowConfigSource, ShadowConfiguration, ShadowType } from "types";

export type ShadowConfigContext<t extends foundry.applications.api.ApplicationV2.RenderContext> = t & {
  shadows: {
    idPrefix: string;
    allowTokenOverride: boolean;
    config: ShadowConfiguration;
    typeSelect: Record<ShadowType, string>;
    alignmentSelect: Record<ShadowAlignment, string>;
    blobShapeSelect: Record<BlobShape, string>;
    adjustPosTooltip: string;
    adjustSizeTooltip: string;
    spriteAnimations: boolean;
    configSourceSelect: Record<ShadowConfigSource, string>;
    configSource?: ShadowConfigSource;
  }
}
