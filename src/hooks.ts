import { TokenMixin } from "./ShadowedToken";

game.SpriteShadows = {};

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

  if (game.SpriteShadows)
    game.SpriteShadows.TokenClass = ShadowedToken;

});

