import { GlobalConfig } from "applications";
import { BlobShadowConfiguration, ShadowConfiguration, StencilShadow, StencilShadowConfiguration } from "types";


export const DefaultBlobShadowConfiguration: BlobShadowConfiguration = {
  enabled: false,
  type: "blob",
  // useTokenOverride: false,
  ignoreSpriteAnimationsMeshAdjustments: false,
  alpha: 1,
  rotation: 0,
  color: "#000000",
  blur: 2,
  shape: "circle",
  adjustForElevation: false,
  elevationIncrement: 1,
  alignment: "bottom",
  liftToken: false,
  adjustments: {
    enabled: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    anchor: {
      x: 0.5,
      y: 0.5
    }
  }
}

export const DefaultStencilShadow: StencilShadow = {
  id: 'INVALID',
  enabled: true,
  ignoreSpriteAnimationsMeshAdjustments: false,
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
    height: 0,
    anchor: {
      x: 0.5,
      y: 1
    }
  }
}

export const DefaultStencilShadowConfiguration: StencilShadowConfiguration = {
  enabled: false,
  type: "stencil",
  shadows: [DefaultStencilShadow]
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

  game?.settings?.register(__MODULE_ID__, "globalConfig", {
    name: "SPRITESHADOWS.SETTINGS.GLOBAL.LABEL",
    hint: "SPRITESHADOWS.SETTINGS.GLOBAL.HINT",
    config: false,
    scope: "world",
    type: Object,
    requiresReload: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onChange(value: ShadowConfiguration) {
      if (!game.SpriteShadows?.TokenClass) return;
      canvas?.scene?.tokens.forEach(token => {
        if (token.object instanceof (game.SpriteShadows.TokenClass as any)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          (token.object as any).refreshShadow(true);
        }
      })
    }
  });

  game?.settings?.registerMenu(__MODULE_ID__, "globalConfigMenu", {
    name: "spriteShadows.globalConfig",
    label: "SPRITESHADOWS.SETTINGS.GLOBAL.LABEL",
    hint: "SPRITESHADOWS.SETTINGS.GLOBAL.HINT",
    icon: "fa-solid fa-cogs",
    restricted: true,
    type: GlobalConfig
  })
})