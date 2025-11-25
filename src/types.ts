export const ShadowTypes = ["blob", "stencil"] as const;
export type ShadowType = typeof ShadowTypes[number];

export const BlobShapes = ["circle"] as const;
export type BlobShape = typeof BlobShapes[number];

export const BlobAlignments = ["bottom", "center"] as const;
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
  }
}

export interface StencilShadowConfiguration extends BaseShadowConfiguration {
  type: "stencil";
}

export type ShadowConfiguration = BlobShadowConfiguration | StencilShadowConfiguration;
