import { TokenMixin, TileMixin } from "./placeables";
import { TokenConfigMixin } from "./applications";


Hooks.once("canvasReady", () => {
  // Initialize Pixi DevTools if we are a debug build
  if (__DEV__ && canvas?.stage) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (window as any).__PIXI_DEVTOOLS__ = {
      stage: canvas.stage,
      renderer: canvas?.app?.renderer
    }
  }
});

Hooks.once("init", () => {
  const ShadowedToken = TokenMixin(CONFIG.Token.objectClass);
  CONFIG.Token.objectClass = ShadowedToken;

  const ShadowedTile = TileMixin(CONFIG.Tile.objectClass);
  CONFIG.Tile.objectClass = ShadowedTile;

  game.SpriteShadows = {
    TokenClass: ShadowedToken,
    TileClass: ShadowedTile
  };
});

Hooks.once("ready", () => {
  // game?.canvas?.app?.ticker.add(() => {
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  //   canvas?.scene?.tokens.forEach(token => { (token.object as any).refreshShadow() });
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  //   canvas?.scene?.tiles.forEach(tile => { (tile.object as any).refreshShadow(); });
  // });

  const entries = Object.entries(CONFIG.Token.sheetClasses.base);
  for (const [key, { cls }] of entries) {
    const mixed = TokenConfigMixin(cls as typeof foundry.applications.sheets.TokenConfig);
    CONFIG.Token.sheetClasses.base[key].cls = mixed as typeof foundry.applications.sheets.TokenConfig
  }
  CONFIG.Token.prototypeSheetClass = TokenConfigMixin(CONFIG.Token.prototypeSheetClass as typeof foundry.applications.sheets.TokenConfig);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateActor", (actor: Actor, delta: Actor.UpdateData, options: Actor.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TokenClass && actor.token?.object instanceof (game.SpriteShadows.TokenClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (actor.token.object as any).refreshShadow()
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateToken", (token: TokenDocument, delta: TokenDocument.UpdateData, options: TokenDocument.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TokenClass && token.object instanceof (game.SpriteShadows.TokenClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (token.object as any).refreshShadow()
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateTile", (tile: TileDocument, delta: TileDocument.UpdateData, options: TileDocument.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TileClass && tile.object instanceof (game.SpriteShadows.TileClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (tile.object as any).refreshShadow();
  }
})