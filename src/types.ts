export const ShadowTypes = ["blob", "stencil"] as const;
export type ShadowType = typeof ShadowTypes[number];

interface BaseShadowConfiguration {
  type: ShadowType;
}

interface BlobShadowConfiguration extends BaseShadowConfiguration {
  type: "blob";
}

interface StencilShadowConfiguration extends BaseShadowConfiguration {
  type: "stencil";
}

export type ShadowConfiguration = BlobShadowConfiguration | StencilShadowConfiguration;
