import { TokenMixin } from "./ShadowedToken";


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

  game.SpriteShadows = {
    TokenClass: ShadowedToken
  };

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
})