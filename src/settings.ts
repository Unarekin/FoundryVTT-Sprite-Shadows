import { BlobShadowConfiguration, ShadowConfiguration, StencilShadowConfiguration } from "types";


export const DefaultBlobShadowConfiguration: BlobShadowConfiguration = {
  enabled: false,
  type: "blob",
  alpha: 1,
  rotation: 0,
  color: "#000000",
  blur: 2,
  shape: "circle",
  adjustForElevation: false,
  elevationIncrement: 0,
  alignment: "bottom",
  liftToken: false,
  adjustments: {
    enabled: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }
}

export const DefaultStencilShadowConfiguration: StencilShadowConfiguration = {
  enabled: false,
  type: "stencil",
  color: "#000000",
  rotation: 0,
  alpha: 0.5,
  skew: (360 - 45) * (Math.PI / 180),
  blur: 2,
  useImage: false,
  image: "",
  alignment: "bottom",
  adjustments: {
    enabled: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }
}

export const DefaultShadowConfiguration: ShadowConfiguration = {
  ...DefaultBlobShadowConfiguration,
  enabled: false,
  type: "blob"
}

Hooks.on("ready", () => {
  game?.settings?.register(__MODULE_ID__, "enableShadows", {
    name: "SPRITESHADOWS.SETTINGS.ENABLE.LABEL",
    hint: "SPRITESHADOWS.SETTINGS.ENABLE.HINT",
    config: true,
    scope: "world",
    type: Boolean,
    default: true,
    requiresReload: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onChange(value: boolean) {
      if (!game.SpriteShadows?.TokenClass) return;

      canvas?.scene?.tokens.forEach(token => {
        if (token.object instanceof (game.SpriteShadows.TokenClass as any)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          (token.object as any).refreshShadow(true);
        }
      })

    }
  });
})