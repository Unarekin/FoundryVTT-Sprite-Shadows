export declare const ShadowTypes: readonly ["blob", "stencil"];
export type ShadowType = typeof ShadowTypes[number];
export declare const BlobShapes: readonly ["circle"];
export type BlobShape = typeof BlobShapes[number];
export declare const BlobAlignments: readonly ["bottom", "center"];
export type BlobAlignment = typeof BlobAlignments[number];
interface BaseShadowConfiguration {
    type: ShadowType;
    enabled: boolean;
}
export interface BlobShadowConfiguration extends BaseShadowConfiguration {
    type: "blob";
    alpha: number;
    color: string;
    blur: number;
    shape: BlobShape;
    adjustForElevation: boolean;
    elevationIncrement: number;
    alignment: BlobAlignment;
    liftToken: boolean;
    adjustments: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface StencilShadowConfiguration extends BaseShadowConfiguration {
    type: "stencil";
}
export type ShadowConfiguration = BlobShadowConfiguration | StencilShadowConfiguration;
export {};
