export type IsObject<T> = T extends Readonly<Record<string, any>>
  ? T extends AnyArray | AnyFunction
  ? false
  : true
  : false;

/**
 * Recursively sets keys of an object to optional. Used primarily for update methods
 * @internal
 */
export type DeepPartial<T> = T extends unknown
  ? IsObject<T> extends true
  ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T
  : T;

export type AnyArray = readonly unknown[];
export type AnyFunction = (arg0: never, ...args: never[]) => unknown;



export const ShadowTypes = ["blob", "stencil"] as const;
export type ShadowType = typeof ShadowTypes[number];

export const BlobShapes = ["circle"] as const;
export type BlobShape = typeof BlobShapes[number];

export const ShadowAlignments = ["bottom", "center"] as const;
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
