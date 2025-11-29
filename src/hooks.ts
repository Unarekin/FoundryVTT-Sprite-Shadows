import { TokenMixin, TileMixin } from "./placeables";
import { TokenConfigMixin, TileConfigMixin } from "./applications";


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

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function applyMixin(collection: Record<string, any>, mixin: Function) {
  const entries = Object.entries(collection);
  for (const [key, { cls }] of entries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const mixed = mixin(cls);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    collection[key].cls = mixed;
  }
}

Hooks.on("ready", () => {
  applyMixin(CONFIG.Token.sheetClasses.base, TokenConfigMixin);
  applyMixin(CONFIG.Tile.sheetClasses.base, TileConfigMixin);
  CONFIG.Token.prototypeSheetClass = TokenConfigMixin(CONFIG.Token.prototypeSheetClass as foundry.applications.sheets.TokenConfig);
})

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