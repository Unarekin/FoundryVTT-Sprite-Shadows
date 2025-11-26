import { BlobShape, ShadowAlignment, ShadowConfiguration, ShadowType } from "types";
export interface TokenConfigContext extends foundry.applications.api.ApplicationV2.RenderContext {
    shadows: {
        idPrefix: string;
        config: ShadowConfiguration;
        typeSelect: Record<ShadowType, string>;
        alignmentSelect: Record<ShadowAlignment, string>;
        blobShapeSelect: Record<BlobShape, string>;
    };
}
