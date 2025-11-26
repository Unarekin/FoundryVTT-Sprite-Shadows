export declare const ShadowTypes: readonly ["blob", "stencil"];
export type ShadowType = typeof ShadowTypes[number];
export declare const BlobShapes: readonly ["circle"];
export type BlobShape = typeof BlobShapes[number];
export declare const ShadowAlignments: readonly ["bottom", "center"];
export type ShadowAlignment = typeof ShadowAlignments[number];
interface BaseShadowConfiguration {
    type: ShadowType;
    enabled: boolean;
    alpha: number;
    color: string;
    alignment: ShadowAlignment;
    adjustments: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface BlobShadowConfiguration extends BaseShadowConfiguration {
    type: "blob";
    blur: number;
    shape: BlobShape;
    adjustForElevation: boolean;
    elevationIncrement: number;
    liftToken: boolean;
}
export interface StencilShadowConfiguration extends BaseShadowConfiguration {
    type: "stencil";
    skew: number;
}
export type ShadowConfiguration = BlobShadowConfiguration | StencilShadowConfiguration;
export {};
