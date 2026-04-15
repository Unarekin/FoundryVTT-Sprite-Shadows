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
  anchor: {
    x: number;
    y: number;
  }
}

export const ShadowConfigSources = ["actor", "token", "scene", "tile", "global"] as const;
export type ShadowConfigSource = typeof ShadowConfigSources[number];

interface ExtendedShadowConfiguration {
  alpha: number;
  color: string;
  alignment: ShadowAlignment;
  adjustments: MeshAdjustments;
  blur: number;
  rotation: number;
  ignoreSpriteAnimationsMeshAdjustments: boolean;
}

interface BaseShadowConfiguration {
  type: ShadowType;
  enabled: boolean;

}

export type BlobShadowConfiguration = BaseShadowConfiguration & ExtendedShadowConfiguration & {
  type: "blob";
  shape: BlobShape;
  adjustForElevation: boolean;
  elevationIncrement: number;
  liftToken: boolean;
  rotateWithToken: boolean;
}

export type OldStencilShadowType = BaseShadowConfiguration & ExtendedShadowConfiguration & {
  type: "stencil";
  skew: number;
  useImage: boolean;
  image: string;
}

export interface StencilShadow extends ExtendedShadowConfiguration {
  id: string;
  enabled: boolean;
  skew: number;
  useImage: boolean;
  image: string;
}

export interface StencilShadowConfiguration extends BaseShadowConfiguration {
  type: "stencil";
  shadows: StencilShadow[];
}

export type ShadowConfiguration = BlobShadowConfiguration | StencilShadowConfiguration;


export interface IsometricFlags {
  isoAnchorX: number;
  isoAnchorY: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  isoTokenDisabled: boolean;
}

export interface ShadowedObject {
  refreshShadow: (force?: boolean) => void;
  blobSprite: PIXI.Sprite;
  stencilSprites: PIXI.Sprite[];
  createStencilShadowSprite(config: StencilShadow): PIXI.Sprite | undefined;
  setStencilShadowConfig(sprite: PIXI.Sprite, config: StencilShadow, mesh: foundry.canvas.primary.PrimarySpriteMesh): void;
  mesh?: foundry.canvas.primary.PrimarySpriteMesh
}