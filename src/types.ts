export const ShadowTypes = ["blob", "stencil"] as const;
export type ShadowType = typeof ShadowTypes[number];

export const BlobShapes = ["circle"] as const;
export type BlobShape = typeof BlobShapes[number];

export const ShadowAlignments = ["bottom", "center"] as const;
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
  }
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
