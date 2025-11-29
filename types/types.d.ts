export type IsObject<T> = T extends Readonly<Record<string, any>> ? T extends AnyArray | AnyFunction ? false : true : false;
/**
 * Recursively sets keys of an object to optional. Used primarily for update methods
 * @internal
 */
export type DeepPartial<T> = T extends unknown ? IsObject<T> extends true ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T : T;
export type AnyArray = readonly unknown[];
export type AnyFunction = (arg0: never, ...args: never[]) => unknown;
export declare const ShadowTypes: readonly ["blob", "stencil"];
export type ShadowType = typeof ShadowTypes[number];
export declare const BlobShapes: readonly ["circle"];
export type BlobShape = typeof BlobShapes[number];
export declare const ShadowAlignments: readonly ["bottom", "center"];
export type ShadowAlignment = typeof ShadowAlignments[number];
export interface MeshAdjustments {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
}
interface BaseShadowConfiguration {
    type: ShadowType;
    enabled: boolean;
    alpha: number;
    color: string;
    alignment: ShadowAlignment;
    adjustments: MeshAdjustments;
    blur: number;
}
export interface BlobShadowConfiguration extends BaseShadowConfiguration {
    type: "blob";
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
